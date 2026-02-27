import { Webhook } from "standardwebhooks";
import { env } from "../config/env";
import { supabase } from "./supabase.service";

type ResendWebhookPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
  };
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getFirstRecipient(payload: ResendWebhookPayload): string | null {
  const first = payload.data?.to?.[0];
  if (!first) return null;
  return normalizeEmail(first);
}

export function verifyResendWebhookSignature(
  rawBody: string,
  headers: Record<string, string>,
) {
  if (!env.RESEND_WEBHOOK_SECRET) {
    throw new Error("Missing RESEND_WEBHOOK_SECRET");
  }

  const wh = new Webhook(env.RESEND_WEBHOOK_SECRET);
  return wh.verify(rawBody, headers);
}

function isSuppressionEvent(type: string | undefined) {
  return type === "email.bounced" || type === "email.complained";
}

export async function handleResendWebhook(
  payload: ResendWebhookPayload,
  providerEventId: string,
) {
  const eventType = payload.type ?? "unknown";
  const recipientEmail = getFirstRecipient(payload);
  const resendEmailId = payload.data?.email_id ?? null;

  const { error: eventErr } = await supabase.from("email_event").insert([
    {
      provider: "resend",
      provider_event_id: providerEventId,
      type: eventType,
      recipient_email: recipientEmail,
      resend_email_id: resendEmailId,
      payload: payload as unknown as Record<string, unknown>,
    },
  ]);

  if (eventErr) {
    const duplicate =
      eventErr.message.toLowerCase().includes("duplicate") ||
      eventErr.message.toLowerCase().includes("unique");
    if (duplicate) return;
    throw new Error(eventErr.message);
  }

  if (isSuppressionEvent(eventType) && recipientEmail) {
    await supabase.from("email_suppression").upsert(
      {
        email: recipientEmail,
        reason: eventType,
        source: "resend_webhook",
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  }

  if (resendEmailId) {
    const mappedStatus =
      eventType === "email.sent"
        ? "sent"
        : eventType === "email.delivered"
          ? "sent"
          : eventType === "email.bounced" || eventType === "email.complained"
            ? "failed"
            : null;

    if (mappedStatus) {
      await supabase
        .from("email_send_attempt")
        .update({
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("resend_email_id", resendEmailId);
    }
  }

  await supabase
    .from("email_event")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", "resend")
    .eq("provider_event_id", providerEventId);
}

export function extractWebhookHeaders(
  incomingHeaders: Record<string, string | string[] | undefined>,
) {
  const out: Record<string, string> = {};

  const resolveHeader = (keys: string[]) => {
    for (const key of keys) {
      const value = incomingHeaders[key];
      if (value && !Array.isArray(value)) return value;
    }
    return null;
  };

  const id = resolveHeader(["webhook-id", "svix-id"]);
  if (!id) throw new Error("Missing webhook-id header");
  out["webhook-id"] = id;

  const signature = resolveHeader(["webhook-signature", "svix-signature"]);
  if (!signature) throw new Error("Missing webhook-signature header");
  out["webhook-signature"] = signature;

  const timestamp = resolveHeader(["webhook-timestamp", "svix-timestamp"]);
  if (!timestamp) throw new Error("Missing webhook-timestamp header");
  out["webhook-timestamp"] = timestamp;

  return out;
}

export function parseResendWebhookPayload(rawBody: string) {
  return JSON.parse(rawBody) as ResendWebhookPayload;
}
