"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type JoinPayload = {
  ok: true;
  join: {
    token: string;
    createdAt: string;
    expiresAt: string | null;
    gift: {
      id: string;
      name: string;
      currency: string;
      totalPriceCents: number;
      splitLockedAt: string | null;
      createdAt: string;
      inviteeCount: number;
    };
  };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function JoinPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JoinPayload | null>(null);
  const [decision, setDecision] = useState<"yes" | "no" | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingStatusMsg, setExistingStatusMsg] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const emailFromQuery = useMemo(
    () => (searchParams.get("email") ?? "").trim().toLowerCase(),
    [searchParams],
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/backend/join/${token}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load invitation");
        }
        if (mounted) setData(json as JoinPayload);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!emailFromQuery) return;
    setEmail((prev) => (prev ? prev : emailFromQuery));
  }, [emailFromQuery]);

  useEffect(() => {
    if (!emailFromQuery) return;

    let mounted = true;
    async function checkExisting() {
      try {
        setCheckingExisting(true);
        setExistingStatusMsg(null);
        const res = await fetch(
          `/backend/join/${token}/invitee-status?email=${encodeURIComponent(emailFromQuery)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to check invitee status");

        const invitee = json?.inviteeStatus?.invitee;
        if (mounted && json?.inviteeStatus?.exists) {
          const status = invitee?.status ?? "unknown";
          setAlreadySubmitted(true);
          setExistingStatusMsg(
            `This email already submitted a response (${status}).`,
          );
        }
      } catch (e) {
        if (mounted) {
          setExistingStatusMsg(
            e instanceof Error ? e.message : "Failed to check invitee status",
          );
        }
      } finally {
        if (mounted) setCheckingExisting(false);
      }
    }
    void checkExisting();

    return () => {
      mounted = false;
    };
  }, [token, emailFromQuery]);

  const total = useMemo(() => {
    if (!data) return "";
    return formatMoney(data.join.gift.totalPriceCents, data.join.gift.currency);
  }, [data]);

  async function onSubmitResponse(e: FormEvent) {
    e.preventDefault();
    if (!decision) {
      setSubmitMsg("Choose Yes or No first.");
      return;
    }
    if (alreadySubmitted) {
      setSubmitMsg("This email already submitted a response.");
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch(`/backend/join/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit");
      setSubmitMsg(
        decision === "yes" ? "Thanks, you are in." : "Thanks, response saved.",
      );
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <div className="card">Loading invitation...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container">
        <div className="card">
          <h1 className="title">Invitation unavailable</h1>
          <p className="error">{error ?? "Invalid invitation"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card">
        <h1 className="title">{data.join.gift.name}</h1>
        <p className="muted">Total gift amount: {total}</p>
        <p className="muted">Current participants: {data.join.gift.inviteeCount}</p>
        {checkingExisting && <p className="muted">Checking existing response...</p>}
        {existingStatusMsg && (
          <p className={alreadySubmitted ? "error" : "muted"}>{existingStatusMsg}</p>
        )}

        {!decision && !alreadySubmitted && (
          <div className="row">
            <button className="primary" onClick={() => setDecision("yes")}>
              Yes, I want to join
            </button>
            <button onClick={() => setDecision("no")} disabled={submitting}>
              No, thanks
            </button>
          </div>
        )}

        {decision && !alreadySubmitted && (
          <form onSubmit={onSubmitResponse}>
            <p className="muted">
              {decision === "yes"
                ? "Fill this out to join."
                : "Fill this out to decline."}
            </p>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <div className="row">
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button
                type="button"
                onClick={() => setDecision(null)}
                disabled={submitting}
              >
                Back
              </button>
            </div>
          </form>
        )}

        {submitMsg && (
          <p className={submitMsg.toLowerCase().includes("thanks") ? "success" : "error"}>
            {submitMsg}
          </p>
        )}
      </div>
    </main>
  );
}
