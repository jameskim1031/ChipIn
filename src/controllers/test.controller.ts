import { CreateSessionSchema } from "../validators/test.schemas";
import { createCheckoutSession } from "../services/stripe.service";
import { sendPaymentEmail } from "../services/email.service";
import { escapeHtml } from "../utils/escapeHtml";
import { formatMoney } from "../utils/money";
import { upsertCreatedSession } from "../store/session.store";
import { Request, Response } from "express";

// creates checkout session and send email
export async function sendCheckoutLink(req: Request, res: Response) {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { email, amountCents, currency, giftName, note } = parsed.data;

  const session = await createCheckoutSession({
    email,
    amountCents,
    currency,
    giftName,
    metadata: { giftName, payerEmail: email },
  });

  if (!session.url)
    return res.status(500).json({ error: "Stripe session URL missing" });

  upsertCreatedSession(session.id, email);

  const subject = `Chip in for: ${giftName}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial;">
      <h2>Chip in for: ${escapeHtml(giftName)}</h2>
      <p>Amount: <strong>${formatMoney(amountCents, currency)}</strong></p>
      ${note ? `<p>${escapeHtml(note)}</p>` : ""}
      <p>
        <a href="${session.url}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#000;color:#fff;text-decoration:none;">
          Pay now
        </a>
      </p>
    </div>
  `;

  await sendPaymentEmail({ to: email, subject, html });

  return res.json({
    ok: true,
    checkoutUrl: session.url,
    stripeSessionId: session.id,
  });
}
