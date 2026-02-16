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
  return res.json({ giftId: data.id });
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
