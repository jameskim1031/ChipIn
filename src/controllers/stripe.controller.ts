import { Request, Response } from "express";
import { constructStripeEvent } from "../services/stripe.service";
import { markSessionPaid } from "../store/session.store";
import Stripe from "stripe";
import { handleStripeWebhookEvent } from "../services/stripeWebhook.service";

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string")
    return res.status(400).send("Missing Stripe-Signature");

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(req.body as Buffer, sig);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Stripe event received:", event.type);

  try {
    await handleStripeWebhookEvent(event);
  } catch (err: any) {
    console.error("❌ Webhook handling failed:", err?.message ?? err);
    return res.status(500).send("Webhook handler failed");
  }

  return res.json({ received: true });
}
