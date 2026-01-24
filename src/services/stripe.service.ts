import Stripe from "stripe";
import { env } from "../config/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// Create a one-time checkout session (hosted Stripe checkout page)
export async function createCheckoutSession(input: {
  email: string;
  amountCents: number;
  currency: string;
  giftName: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${env.APP_BASE_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_BASE_URL}/pay/cancel`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency,
          unit_amount: input.amountCents,
          product_data: { name: input.giftName },
        },
      },
    ],
    customer_email: input.email,
    metadata: input.metadata ?? {},
  });

  return session;
}

export function constructStripeEvent(rawBody: Buffer, signature: string) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );
}
