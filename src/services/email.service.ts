import { Resend } from "resend";
import { env } from "../config/env";
import { supabase } from "./supabase.service";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isMissingRelationError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find the table") ||
    m.includes("schema cache")
  );
}

async function isSuppressedEmail(email: string) {
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase
    .from("email_suppression")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error.message)) return false;
    throw new Error(error.message);
  }
  return Boolean(data?.email);
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  template: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function sendTransactionalEmail(input: SendEmailInput) {
  const normalizedTo = normalizeEmail(input.to);
  const from = env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    return { skipped: true as const, reason: "not_configured" as const };
  }

  if (await isSuppressedEmail(normalizedTo)) {
    await supabase.from("email_send_attempt").insert([
      {
        template: input.template,
        recipient_email: normalizedTo,
        subject: input.subject,
        status: "suppressed",
        error_message: "Recipient is on suppression list",
        metadata: input.metadata ?? {},
      },
    ]);

    return { skipped: true as const, reason: "suppressed" as const };
  }

  const { data: logRow, error: logErr } = await supabase
    .from("email_send_attempt")
    .insert([
      {
        template: input.template,
        recipient_email: normalizedTo,
        subject: input.subject,
        status: "queued",
        metadata: input.metadata ?? {},
      },
    ])
    .select("id")
    .single();

  if (logErr && isMissingRelationError(logErr.message)) {
    const result = await resend.emails.send({
      from,
      to: normalizedTo,
      subject: input.subject,
      html: input.html,
    });

    if (result.error) throw new Error(result.error.message);
    return {
      skipped: false as const,
      resendEmailId: result.data?.id ?? null,
      sendAttemptId: null,
    };
  }

  if (logErr || !logRow?.id)
    throw new Error(logErr?.message ?? "Failed to log queued email attempt");

  try {
    const result = await resend.emails.send({
      from,
      to: normalizedTo,
      subject: input.subject,
      html: input.html,
    });

    const resendEmailId = result.data?.id ?? null;
    const sendErrorMessage = result.error?.message ?? null;
    const sendStatus = result.error ? "failed" : "sent";

    const { error: updateErr } = await supabase
      .from("email_send_attempt")
      .update({
        status: sendStatus,
        resend_email_id: resendEmailId,
        error_message: sendErrorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    if (updateErr) throw new Error(updateErr.message);
    if (result.error) throw new Error(result.error.message);

    return {
      skipped: false as const,
      resendEmailId,
      sendAttemptId: logRow.id,
    };
  } catch (err: any) {
    await supabase
      .from("email_send_attempt")
      .update({
        status: "failed",
        error_message: err?.message ?? "Unknown email send error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    throw err;
  }
}

export async function sendPaymentEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  return sendTransactionalEmail({
    ...input,
    template: "payment_link",
  });
}
