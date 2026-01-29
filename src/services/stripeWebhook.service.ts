import Stripe from "stripe";
import { supabase } from "./supabase.service";

function isDuplicateEvent(errMsg: string) {
  const m = errMsg.toLowerCase();
  return m.includes("duplicate") || m.includes("unique");
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  // 1) idempotency: store event id (Stripe retries)
  const { error: evtErr } = await supabase.from("stripe_event").insert([
    {
      stripe_event_id: event.id,
      type: event.type,
      received_at: new Date().toISOString(),
    },
  ]);

  if (evtErr) {
    if (isDuplicateEvent(evtErr.message)) return; // already processed
    throw new Error(evtErr.message);
  }

  // 2) handle event types
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;

    // Update stripe_checkout_session by stripe_session_id, and get invitee_id
    const { data: sessRow, error: sessErr } = await supabase
      .from("stripe_checkout_session")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        amount_total_cents: session.amount_total ?? null,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("stripe_session_id", session.id)
      .select("invitee_id")
      .single();

    if (sessErr) throw new Error(sessErr.message);
    if (!sessRow?.invitee_id)
      throw new Error("No invitee_id linked to this session");

    // Mark invitee paid
    const { error: invErr } = await supabase
      .from("gift_invitee")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", sessRow.invitee_id);

    if (invErr) throw new Error(invErr.message);
  }

  // 3) (optional) mark handled
  await supabase
    .from("stripe_event")
    .update({ handled_at: new Date().toISOString() })
    .eq("stripe_event_id", event.id);
}
