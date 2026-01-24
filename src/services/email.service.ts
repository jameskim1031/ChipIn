import { Resend } from "resend";
import { env } from "../config/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendPaymentEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) return; // no-op if not configured

  await resend.emails.send({
    from: "Gift Split <onboarding@resend.dev>", // for production: use your verified domain
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
