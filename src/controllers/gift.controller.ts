import type { Request, Response } from "express";
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
  CreateGiftSchema,
} from "../validators/gift.schemas";
import { getLatestCheckoutSessionForInvitee } from "../services/checkoutSession.repo";

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
