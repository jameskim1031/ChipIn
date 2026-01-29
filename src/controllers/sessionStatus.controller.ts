import type { Request, Response } from "express";
import { supabase } from "../services/supabase.service";

export async function getSessionStatusDb(req: Request, res: Response) {
  const sessionId = req.params.sessionId;

  // 1) lookup session row
  const { data: sess, error: sessErr } = await supabase
    .from("stripe_checkout_session")
    .select(
      "stripe_session_id,status,amount_total_cents,created_at,paid_at,invitee_id",
    )
    .eq("stripe_session_id", sessionId)
    .single();

  if (sessErr || !sess)
    return res.status(404).json({ error: "Unknown sessionId" });

  // 2) lookup invitee row (optional but useful)
  const { data: inv, error: invErr } = await supabase
    .from("gift_invitee")
    .select("id,gift_id,email,status,amount_cents,created_at,paid_at")
    .eq("id", sess.invitee_id)
    .single();

  if (invErr || !inv) {
    // still return session info even if invitee lookup fails
    return res.json({
      ok: true,
      status: {
        sessionId: sess.stripe_session_id,
        status: sess.status,
        amountTotalCents: sess.amount_total_cents,
        createdAt: sess.created_at,
        paidAt: sess.paid_at,
        invitee: null,
      },
    });
  }

  return res.json({
    ok: true,
    status: {
      sessionId: sess.stripe_session_id,
      status: sess.status, // 'created' | 'paid' | 'expired'
      amountTotalCents: sess.amount_total_cents,
      createdAt: sess.created_at,
      paidAt: sess.paid_at,
      invitee: {
        id: inv.id,
        giftId: inv.gift_id,
        email: inv.email,
        status: inv.status,
        amountCents: inv.amount_cents,
        createdAt: inv.created_at,
        paidAt: inv.paid_at,
      },
    },
  });
}
