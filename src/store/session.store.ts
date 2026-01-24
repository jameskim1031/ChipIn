export type SessionStatus = {
  sessionId: string;
  email: string;
  amountTotal: number | null;
  status: "created" | "paid";
  createdAt: number;
  paidAt: number | null;
};

const sessionStore = new Map<string, SessionStatus>();

export function upsertCreatedSession(sessionId: string, email: string) {
  sessionStore.set(sessionId, {
    sessionId,
    email,
    amountTotal: null,
    status: "created",
    createdAt: Date.now(),
    paidAt: null,
  });
}

export function markSessionPaid(sessionId: string, amountTotal: number | null) {
  const existing = sessionStore.get(sessionId);
  if (!existing) {
    sessionStore.set(sessionId, {
      sessionId,
      email: "unknown",
      amountTotal: amountTotal ?? null,
      status: "paid",
      createdAt: Date.now(),
      paidAt: Date.now(),
    });
    return;
  }
  existing.status = "paid";
  existing.amountTotal = amountTotal ?? existing.amountTotal;
  existing.paidAt = Date.now();
  sessionStore.set(sessionId, existing);
}

export function getSessionStatus(sessionId: string) {
  return sessionStore.get(sessionId) ?? null;
}
