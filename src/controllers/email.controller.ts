import type { Request, Response } from "express";
import {
  extractWebhookHeaders,
  handleResendWebhook,
  parseResendWebhookPayload,
  verifyResendWebhookSignature,
} from "../services/resendWebhook.service";

export async function resendWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : JSON.stringify(req.body ?? {});

  let headers: Record<string, string>;
  try {
    headers = extractWebhookHeaders(req.headers);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Missing webhook headers" });
  }

  try {
    verifyResendWebhookSignature(rawBody, headers);
  } catch (err: any) {
    return res
      .status(400)
      .json({ error: `Invalid webhook signature: ${err?.message ?? "unknown"}` });
  }

  try {
    const payload = parseResendWebhookPayload(rawBody);
    await handleResendWebhook(payload, headers["webhook-id"]);
    return res.json({ received: true });
  } catch (err: any) {
    console.error("Resend webhook handling failed:", err?.message ?? err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
