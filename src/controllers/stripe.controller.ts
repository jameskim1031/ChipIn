import { Request, Response } from "express";
import { constructStripeEvent } from "../services/stripe.service";
import { markSessionPaid } from "../store/session.store";
import Stripe from "stripe";

export function stripeWebhook(req: Request, res: Response) {
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    markSessionPaid(session.id, session.amount_total ?? null);
  }

  return res.json({ received: true });
}
