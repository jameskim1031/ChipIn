import type { Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../services/supabase.service";
import {
  createCheckoutSession,
  retrieveCheckoutSession,
} from "../services/stripe.service";
import { sendPaymentEmail } from "../services/email.service";
import { computeEvenSplit, formatMoney } from "../utils/money";
import { escapeHtml } from "../utils/escapeHtml";
import {
  AddInviteesSchema,
  CreateInvitationLinkSchema,
  CreateGiftSchema,
  JoinInviteeStatusQuerySchema,
  JoinRespondSchema,
  JoinTokenParamsSchema,
} from "../validators/gift.schemas";
import { getLatestCheckoutSessionForInvitee } from "../services/checkoutSession.repo";
import { env } from "../config/env";

function generateInvitationToken() {
  return crypto
    .randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function createGift(req: Request, res: Response) {
  const parsed = CreateGiftSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { name, totalPriceCents, currency } = parsed.data;

  const { data, error } = await supabase
    .from("gift")
    .insert([{ name, currency, total_price_cents: totalPriceCents }])
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const expiresAtIso = expiresAt.toISOString();

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateInvitationToken();
    const { data: link, error: linkErr } = await supabase
      .from("gift_invitation_link")
      .insert([{ gift_id: data.id, token, expires_at: expiresAtIso }])
      .select("id,gift_id,token,created_at,expires_at,revoked_at")
      .single();

    if (!linkErr && link) {
      return res.status(201).json({
        giftId: data.id,
        invitationLink: {
          id: link.id,
          giftId: link.gift_id,
          token: link.token,
          createdAt: link.created_at,
          expiresAt: link.expires_at,
          revokedAt: link.revoked_at,
          url: `${env.APP_BASE_URL}/join/${link.token}`,
        },
      });
    }

    if (linkErr?.code !== "23505")
      return res.status(500).json({ error: linkErr?.message ?? "Unknown error" });
  }

  return res
    .status(500)
    .json({ error: "Gift created, but failed to generate invitation link" });
}

type GiftCounts = {
  invited: number;
  accepted: number;
  declined: number;
  checkoutCreated: number;
  paid: number;
};

function emptyGiftCounts(): GiftCounts {
  return {
    invited: 0,
    accepted: 0,
    declined: 0,
    checkoutCreated: 0,
    paid: 0,
  };
}

function addToCounts(counts: GiftCounts, status: string) {
  if (status === "invited") counts.invited += 1;
  else if (status === "accepted") counts.accepted += 1;
  else if (status === "declined") counts.declined += 1;
  else if (status === "checkout_created") counts.checkoutCreated += 1;
  else if (status === "paid") counts.paid += 1;
}

export async function listGifts(req: Request, res: Response) {
  const { data: gifts, error: giftsErr } = await supabase
    .from("gift")
    .select("id,name,currency,total_price_cents,split_locked_at,created_at")
    .order("created_at", { ascending: false });

  if (giftsErr) return res.status(500).json({ error: giftsErr.message });
  if (!gifts?.length) return res.json({ ok: true, gifts: [] });

  const giftIds = gifts.map((g) => g.id);
  const { data: invitees, error: inviteesErr } = await supabase
    .from("gift_invitee")
    .select("gift_id,status,amount_cents")
    .in("gift_id", giftIds);
  if (inviteesErr) return res.status(500).json({ error: inviteesErr.message });

  const byGift = new Map<
    string,
    { counts: GiftCounts; assignedTotalCents: number; paidTotalCents: number }
  >();

  for (const giftId of giftIds) {
    byGift.set(giftId, {
      counts: emptyGiftCounts(),
      assignedTotalCents: 0,
      paidTotalCents: 0,
    });
  }

  for (const inv of invitees ?? []) {
    const agg = byGift.get(inv.gift_id);
    if (!agg) continue;

    addToCounts(agg.counts, inv.status);
    if (inv.amount_cents != null) agg.assignedTotalCents += inv.amount_cents;
    if (inv.status === "paid" && inv.amount_cents != null)
      agg.paidTotalCents += inv.amount_cents;
  }

  return res.json({
    ok: true,
    gifts: gifts.map((gift) => {
      const agg = byGift.get(gift.id) ?? {
        counts: emptyGiftCounts(),
        assignedTotalCents: 0,
        paidTotalCents: 0,
      };

      return {
        id: gift.id,
        name: gift.name,
        currency: gift.currency,
        totalPriceCents: gift.total_price_cents,
        splitLockedAt: gift.split_locked_at,
        createdAt: gift.created_at,
        counts: agg.counts,
        amounts: {
          assignedTotalCents: agg.assignedTotalCents,
          paidTotalCents: agg.paidTotalCents,
        },
      };
    }),
  });
}

export async function getGiftById(req: Request, res: Response) {
  const giftId = req.params.giftId;

  const { data: gift, error: giftErr } = await supabase
    .from("gift")
    .select("id,name,currency,total_price_cents,split_locked_at,created_at")
    .eq("id", giftId)
    .single();

  if (giftErr || !gift)
    return res.status(404).json({ error: "Gift not found" });

  const { data: invitees, error: invErr } = await supabase
    .from("gift_invitee")
    .select("id,gift_id,name,email,phone,status,amount_cents,created_at,paid_at")
    .eq("gift_id", giftId)
    .order("created_at", { ascending: true });
  if (invErr) return res.status(500).json({ error: invErr.message });

  const counts = emptyGiftCounts();
  let assignedTotalCents = 0;
  let paidTotalCents = 0;

  for (const inv of invitees ?? []) {
    addToCounts(counts, inv.status);
    if (inv.amount_cents != null) assignedTotalCents += inv.amount_cents;
    if (inv.status === "paid" && inv.amount_cents != null)
      paidTotalCents += inv.amount_cents;
  }

  const eligibleForSplit = (invitees ?? []).filter(
    (i) => i.status !== "declined" && i.status !== "canceled",
  );

  let perPersonPreviewCents: number | null = null;
  if (eligibleForSplit.length > 0) {
    const split = computeEvenSplit(gift.total_price_cents, eligibleForSplit.length);
    perPersonPreviewCents = split[0] ?? null;
  }

  return res.json({
    ok: true,
    gift: {
      id: gift.id,
      name: gift.name,
      currency: gift.currency,
      totalPriceCents: gift.total_price_cents,
      splitLockedAt: gift.split_locked_at,
      createdAt: gift.created_at,
    },
    summary: {
      counts,
      amounts: {
        assignedTotalCents,
        paidTotalCents,
        remainingCents: Math.max(gift.total_price_cents - paidTotalCents, 0),
      },
      perPersonPreviewCents,
    },
    invitees: (invitees ?? []).map((inv) => ({
      id: inv.id,
      name: inv.name,
      email: inv.email,
      phone: inv.phone,
      status: inv.status,
      amountCents: inv.amount_cents,
      createdAt: inv.created_at,
      paidAt: inv.paid_at,
    })),
  });
}

export async function addInvitees(req: Request, res: Response) {
  const giftId = req.params.giftId;
  const parsed = AddInviteesSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { data: gift, error: giftErr } = await supabase
    .from("gift")
    .select("id,split_locked_at")
    .eq("id", giftId)
    .single();

  if (giftErr) return res.status(404).json({ error: "Gift not found" });
  if (gift.split_locked_at)
    return res
      .status(409)
      .json({ error: "Gift is already locked; cannot add invitees" });

  const rows = parsed.data.emails.map((email) => ({
    gift_id: giftId,
    email: email.toLowerCase().trim(),
    status: "invited",
  }));

  const { data, error } = await supabase
    .from("gift_invitee")
    .insert(rows)
    .select("id,gift_id,email,amount_cents,status,created_at,paid_at");

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, invitees: data ?? [] });
}

export async function createInvitationLink(req: Request, res: Response) {
  const giftId = req.params.giftId;
  const parsed = CreateInvitationLinkSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { data: gift, error: giftErr } = await supabase
    .from("gift")
    .select("id")
    .eq("id", giftId)
    .single();

  if (giftErr || !gift)
    return res.status(404).json({ error: "Gift not found" });

  let expiresAtIso: string | null = null;
  if (parsed.data.expiresAt) {
    expiresAtIso = new Date(parsed.data.expiresAt).toISOString();
  } else {
    const expiresInDays = parsed.data.expiresInDays ?? 7;
    const d = new Date();
    d.setDate(d.getDate() + expiresInDays);
    expiresAtIso = d.toISOString();
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateInvitationToken();

    const { data: link, error: linkErr } = await supabase
      .from("gift_invitation_link")
      .insert([{ gift_id: giftId, token, expires_at: expiresAtIso }])
      .select("id,gift_id,token,created_at,expires_at,revoked_at")
      .single();

    if (!linkErr && link) {
      return res.status(201).json({
        ok: true,
        invitationLink: {
          id: link.id,
          giftId: link.gift_id,
          token: link.token,
          createdAt: link.created_at,
          expiresAt: link.expires_at,
          revokedAt: link.revoked_at,
          url: `${env.APP_BASE_URL}/join/${link.token}`,
        },
      });
    }

    if (linkErr?.code !== "23505") {
      return res.status(500).json({ error: linkErr?.message ?? "Unknown error" });
    }
  }

  return res
    .status(500)
    .json({ error: "Failed to generate unique invitation token" });
}

export async function getLatestInvitationLinkForGift(
  req: Request,
  res: Response,
) {
  const giftId = req.params.giftId;
  const nowIso = new Date().toISOString();

  const { data: gift, error: giftErr } = await supabase
    .from("gift")
    .select("id")
    .eq("id", giftId)
    .single();

  if (giftErr || !gift)
    return res.status(404).json({ error: "Gift not found" });

  const { data: link, error: linkErr } = await supabase
    .from("gift_invitation_link")
    .select("id,gift_id,token,created_at,expires_at,revoked_at")
    .eq("gift_id", giftId)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkErr) return res.status(500).json({ error: linkErr.message });
  if (!link) return res.status(404).json({ error: "No active invitation link found" });

  return res.json({
    ok: true,
    invitationLink: {
      id: link.id,
      giftId: link.gift_id,
      token: link.token,
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      revokedAt: link.revoked_at,
      url: `${env.APP_BASE_URL}/join/${link.token}`,
    },
  });
}

export async function getJoinGiftByToken(req: Request, res: Response) {
  const parsed = JoinTokenParamsSchema.safeParse(req.params);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { token } = parsed.data;
  const nowIso = new Date().toISOString();

  const { data: link, error: linkErr } = await supabase
    .from("gift_invitation_link")
    .select("id,gift_id,token,created_at,expires_at,revoked_at")
    .eq("token", token)
    .single();

  if (linkErr || !link)
    return res.status(404).json({ error: "Invitation link not found" });
  if (link.revoked_at)
    return res.status(410).json({ error: "Invitation link has been revoked" });
  if (link.expires_at && link.expires_at <= nowIso)
    return res.status(410).json({ error: "Invitation link has expired" });

  const { data: gift, error: giftErr } = await supabase
    .from("gift")
    .select("id,name,currency,total_price_cents,split_locked_at,created_at")
    .eq("id", link.gift_id)
    .single();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found" });

  const { count: inviteeCount, error: countErr } = await supabase
    .from("gift_invitee")
    .select("id", { count: "exact", head: true })
    .eq("gift_id", gift.id);
  if (countErr) return res.status(500).json({ error: countErr.message });

  return res.json({
    ok: true,
    join: {
      token: link.token,
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      gift: {
        id: gift.id,
        name: gift.name,
        currency: gift.currency,
        totalPriceCents: gift.total_price_cents,
        splitLockedAt: gift.split_locked_at,
        createdAt: gift.created_at,
        inviteeCount: inviteeCount ?? 0,
      },
    },
  });
}

export async function getJoinInviteeStatus(req: Request, res: Response) {
  const paramsParsed = JoinTokenParamsSchema.safeParse(req.params);
  if (!paramsParsed.success)
    return res.status(400).json({ error: paramsParsed.error.flatten() });

  const queryParsed = JoinInviteeStatusQuerySchema.safeParse({
    email: req.query.email,
  });
  if (!queryParsed.success)
    return res.status(400).json({ error: queryParsed.error.flatten() });

  const { token } = paramsParsed.data;
  const normalizedEmail = queryParsed.data.email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  const { data: link, error: linkErr } = await supabase
    .from("gift_invitation_link")
    .select("id,gift_id,token,created_at,expires_at,revoked_at")
    .eq("token", token)
    .single();

  if (linkErr || !link)
    return res.status(404).json({ error: "Invitation link not found" });
  if (link.revoked_at)
    return res.status(410).json({ error: "Invitation link has been revoked" });
  if (link.expires_at && link.expires_at <= nowIso)
    return res.status(410).json({ error: "Invitation link has expired" });

  const { data: invitee, error: inviteeErr } = await supabase
    .from("gift_invitee")
    .select("id,email,name,phone,status,created_at,paid_at")
    .eq("gift_id", link.gift_id)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (inviteeErr) return res.status(500).json({ error: inviteeErr.message });

  if (!invitee) {
    return res.json({
      ok: true,
      inviteeStatus: { exists: false },
    });
  }

  return res.json({
    ok: true,
    inviteeStatus: {
      exists: true,
      invitee: {
        id: invitee.id,
        email: invitee.email,
        name: invitee.name,
        phone: invitee.phone,
        status: invitee.status,
        createdAt: invitee.created_at,
        paidAt: invitee.paid_at,
      },
    },
  });
}

export async function respondToJoinInvitation(req: Request, res: Response) {
  const paramsParsed = JoinTokenParamsSchema.safeParse(req.params);
  if (!paramsParsed.success)
    return res.status(400).json({ error: paramsParsed.error.flatten() });

  const bodyParsed = JoinRespondSchema.safeParse(req.body ?? {});
  if (!bodyParsed.success)
    return res.status(400).json({ error: bodyParsed.error.flatten() });

  const { token } = paramsParsed.data;
  const nowIso = new Date().toISOString();

  const { data: link, error: linkErr } = await supabase
    .from("gift_invitation_link")
    .select("id,gift_id,token,created_at,expires_at,revoked_at")
    .eq("token", token)
    .single();

  if (linkErr || !link)
    return res.status(404).json({ error: "Invitation link not found" });
  if (link.revoked_at)
    return res.status(410).json({ error: "Invitation link has been revoked" });
  if (link.expires_at && link.expires_at <= nowIso)
    return res.status(410).json({ error: "Invitation link has expired" });

  const { data: gift, error: giftErr } = await supabase
    .from("gift")
    .select("id,split_locked_at")
    .eq("id", link.gift_id)
    .single();

  if (giftErr || !gift) return res.status(404).json({ error: "Gift not found" });
  if (gift.split_locked_at)
    return res
      .status(409)
      .json({ error: "Gift is already locked and cannot accept new joins" });

  const normalizedEmail = bodyParsed.data.email.trim().toLowerCase();
  const normalizedName = bodyParsed.data.name.trim();
  const normalizedPhone = bodyParsed.data.phone.trim();

  const { data: existing, error: existingErr } = await supabase
    .from("gift_invitee")
    .select("id")
    .eq("gift_id", gift.id)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingErr) return res.status(500).json({ error: existingErr.message });

  if (existing?.id) {
    if (bodyParsed.data.decision === "no") {
      const { data: declined, error: declineErr } = await supabase
        .from("gift_invitee")
        .update({
          email: normalizedEmail,
          name: normalizedName,
          phone: normalizedPhone,
          status: "declined",
        })
        .eq("id", existing.id)
        .select("id,gift_id,email,name,phone,status,created_at,paid_at")
        .single();

      if (declineErr) return res.status(500).json({ error: declineErr.message });
      return res.json({ ok: true, invitee: declined });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("gift_invitee")
      .update({
        email: normalizedEmail,
        name: normalizedName,
        phone: normalizedPhone,
        status: "accepted",
      })
      .eq("id", existing.id)
      .select("id,gift_id,email,name,phone,status,created_at,paid_at")
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.json({ ok: true, invitee: updated });
  }

  if (bodyParsed.data.decision === "no") {
    const { data: declined, error: declineInsertErr } = await supabase
      .from("gift_invitee")
      .insert([
        {
          gift_id: gift.id,
          email: normalizedEmail,
          name: normalizedName,
          phone: normalizedPhone,
          status: "declined",
        },
      ])
      .select("id,gift_id,email,name,phone,status,created_at,paid_at")
      .single();

    if (declineInsertErr)
      return res.status(500).json({ error: declineInsertErr.message });
    return res.status(201).json({ ok: true, invitee: declined });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("gift_invitee")
    .insert([
      {
        gift_id: gift.id,
        email: normalizedEmail,
        name: normalizedName,
        phone: normalizedPhone,
        status: "accepted",
      },
    ])
    .select("id,gift_id,email,name,phone,status,created_at,paid_at")
    .single();

  if (insertErr) return res.status(500).json({ error: insertErr.message });
  return res.status(201).json({ ok: true, invitee: inserted });
}

export type LockAndSendResult = {
  email: string;
  amountCents: number;
  stripeSessionId: string;
  checkoutUrl: string;
  reused: boolean;
};

export async function lockAndSend(req: Request, res: Response) {
  const giftId = req.params.giftId;

  const { data: gift, error: giftErr } = await supabase
    .from("gift")
    .select("id,name,currency,total_price_cents,split_locked_at")
    .eq("id", giftId)
    .single();

  if (giftErr || !gift)
    return res.status(404).json({ error: "Gift not found" });

  if (!gift.split_locked_at) {
    const { error: lockErr } = await supabase
      .from("gift")
      .update({ split_locked_at: new Date().toISOString() })
      .eq("id", giftId)
      .is("split_locked_at", null);

    if (lockErr) return res.status(500).json({ error: lockErr.message });
  }

  const { data: invitees, error: invErr } = await supabase
    .from("gift_invitee")
    .select("id,email,status,amount_cents,created_at")
    .eq("gift_id", giftId)
    .not("status", "in", "(declined,canceled)")
    .order("created_at", { ascending: true });

  if (invErr) return res.status(500).json({ error: invErr.message });
  if (!invitees?.length)
    return res.status(400).json({ error: "No invitees to split with" });

  // assign amounts once
  if (invitees.some((i) => i.amount_cents == null)) {
    const amounts = computeEvenSplit(gift.total_price_cents, invitees.length);
    for (let i = 0; i < invitees.length; i++) {
      const { error } = await supabase
        .from("gift_invitee")
        .update({ amount_cents: amounts[i] })
        .eq("id", invitees[i].id);
      if (error) return res.status(500).json({ error: error.message });
    }
  }

  const { data: assigned, error: assignedErr } = await supabase
    .from("gift_invitee")
    .select("id,email,status,amount_cents,created_at")
    .eq("gift_id", giftId)
    .not("status", "in", "(declined,canceled)")
    .order("created_at", { ascending: true });

  if (assignedErr) return res.status(500).json({ error: assignedErr.message });
  if (!assigned)
    return res.status(500).json({ error: "Failed to load invitees" });

  const results: Array<LockAndSendResult> = [];

  for (const inv of assigned) {
    if (inv.status === "paid") continue;
    if (inv.amount_cents == null)
      return res.status(500).json({ error: "Invitee amount missing" });

    // 1) If there is an existing unpaid session, reuse it (NO email)
    const existing = await getLatestCheckoutSessionForInvitee(inv.id);

    if (existing && existing.status === "created") {
      const s = await retrieveCheckoutSession(existing.stripe_session_id);

      results.push({
        email: inv.email,
        amountCents: inv.amount_cents,
        stripeSessionId: existing.stripe_session_id,
        checkoutUrl: s.url ?? "", // can be "" if Stripe doesn't return it
        reused: true,
      });

      continue;
    }

    // 2) Otherwise create a new session + insert + email
    const session = await createCheckoutSession({
      email: inv.email,
      amountCents: inv.amount_cents,
      currency: gift.currency,
      giftName: gift.name,
      metadata: { giftId: gift.id, inviteeId: inv.id },
    });

    if (!session.url)
      return res.status(500).json({ error: "Stripe session URL missing" });

    const { error: sessErr } = await supabase
      .from("stripe_checkout_session")
      .insert([
        {
          invitee_id: inv.id,
          stripe_session_id: session.id,
          status: "created",
        },
      ]);
    if (sessErr) return res.status(500).json({ error: sessErr.message });

    const { error: invUpdErr } = await supabase
      .from("gift_invitee")
      .update({ status: "checkout_created" })
      .eq("id", inv.id);
    if (invUpdErr) return res.status(500).json({ error: invUpdErr.message });

    // Email only when newly created
    const subject = `Chip in: ${gift.name}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial;">
        <h2>Chip in for: ${escapeHtml(gift.name)}</h2>
        <p>Amount: <strong>${escapeHtml(formatMoney(inv.amount_cents, gift.currency))}</strong></p>
        <p><a href="${session.url}">Pay now</a></p>
      </div>
    `;
    await sendPaymentEmail({ to: inv.email, subject, html });

    results.push({
      email: inv.email,
      amountCents: inv.amount_cents,
      stripeSessionId: session.id,
      checkoutUrl: session.url,
      reused: false,
    });
  }

  console.log(results);
  return res.json({ ok: true, results });
}
