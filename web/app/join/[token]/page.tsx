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
  const [submittedDecision, setSubmittedDecision] = useState<"yes" | "no" | null>(null);
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
          setExistingStatusMsg(`This email already submitted a response (${status}).`);
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
      setSubmittedDecision(decision);
      setSubmitMsg(decision === "yes" ? "Thanks, you are in." : "Thanks, response saved.");
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="figmaJoinShell">
        <div className="figmaJoinCard figmaLoadingState">
          <div className="figmaLoadingDots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="figmaLoadingLabel">Loading</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="figmaJoinShell">
        <div className="figmaJoinCard">
          <h1>Invitation unavailable</h1>
          <p className="figmaMessageError">{error ?? "Invalid invitation"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="figmaJoinShell">
      <div className="figmaJoinCard">
        {submittedDecision ? (
          <div className="figmaSuccessPanel figmaJoinSuccessPanel">
            <div className="figmaJoinConfetti" aria-hidden="true">
              <span className="figmaJoinConfettiPiece figmaJoinConfettiPink" />
              <span className="figmaJoinConfettiPiece figmaJoinConfettiPurple" />
              <span className="figmaJoinConfettiPiece figmaJoinConfettiBlue" />
              <span className="figmaJoinConfettiPiece figmaJoinConfettiGold" />
              <span className="figmaJoinConfettiPiece figmaJoinConfettiPink" />
              <span className="figmaJoinConfettiPiece figmaJoinConfettiBlue" />
            </div>
            <div className="figmaAuthLogo">C</div>
            <p className="figmaDashboardKicker">
              {submittedDecision === "yes" ? "You joined" : "Response saved"}
            </p>
            <h2>
              {submittedDecision === "yes"
                ? "Congrats, you’re in"
                : "Thanks for letting the host know"}
            </h2>
            <p>
              {submittedDecision === "yes"
                ? "Your host will follow up soon with the next details."
                : "Your response has been recorded. The host will follow up soon if needed."}
            </p>
          </div>
        ) : (
          <>
            <div className="figmaJoinHeader">
              <div className="figmaAuthLogo">C</div>
              <p className="figmaDashboardKicker">You&apos;re invited</p>
              <h1>{data.join.gift.name}</h1>
              <p>
                Join the group gift, or let the organizer know you&apos;re passing this time.
              </p>
            </div>

            <div className="figmaJoinStats">
              <div className="figmaJoinStat">
                <span>Total gift amount</span>
                <strong>{total}</strong>
              </div>
              <div className="figmaJoinStat">
                <span>Current participants</span>
                <strong>{data.join.gift.inviteeCount}</strong>
              </div>
            </div>

            {checkingExisting ? <p className="figmaMessageInfo">Checking existing response...</p> : null}
            {existingStatusMsg ? (
              <p className={alreadySubmitted ? "figmaMessageError" : "figmaMessageInfo"}>
                {existingStatusMsg}
              </p>
            ) : null}

            {!decision && !alreadySubmitted ? (
              <div className="figmaJoinDecisionRow figmaJoinDecisionStack">
                <button className="figmaPrimaryButton" onClick={() => setDecision("yes")}>
                  Yes, I want to join
                </button>
                <button className="figmaGhostButton" onClick={() => setDecision("no")} disabled={submitting}>
                  No, thanks
                </button>
              </div>
            ) : null}

            {decision && !alreadySubmitted ? (
              <form onSubmit={onSubmitResponse} className="figmaJoinForm">
                <p className="figmaGiftSummary">
                  {decision === "yes" ? "Fill this out to join." : "Fill this out to decline."}
                </p>

                <label htmlFor="name">Name</label>
                <input
                  className="figmaInput"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <label htmlFor="email">Email</label>
                <input
                  className="figmaInput"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <label htmlFor="phone">Phone</label>
                <input
                  className="figmaInput"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />

                <div className="figmaJoinDecisionRow">
                  <button className="figmaPrimaryButton" type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    className="figmaGhostButton"
                    type="button"
                    onClick={() => setDecision(null)}
                    disabled={submitting}
                  >
                    Back
                  </button>
                </div>
              </form>
            ) : null}

            {submitMsg ? (
              <p className={submitMsg.toLowerCase().includes("thanks") ? "figmaMessageInfo" : "figmaMessageError"}>
                {submitMsg}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
