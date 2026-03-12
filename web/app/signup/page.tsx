"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

type SignupStep = "email" | "password" | "profile";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [signupComplete, setSignupComplete] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function loadSession() {
      const sessionRes = await supabase.auth.getSession();
      if (sessionRes.data.session) router.replace("/gifts");
    }
    void loadSession();
  }, [router]);

  function onNextEmail(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) {
      setMsg("Please enter your email.");
      return;
    }
    setStep("password");
  }

  function onNextPassword(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!password.trim()) {
      setMsg("Please set a password.");
      return;
    }
    setStep("profile");
  }

  async function onSignup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (!consent) {
      setLoading(false);
      setMsg("Please agree to consent before signing up.");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            dob,
            consent,
          },
        },
      });
      if (error) throw error;
      setSentToEmail(email.trim().toLowerCase());
      setSignupComplete(true);
      setMsg(null);
    } catch (err: any) {
      setMsg(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  function maskEmail(input: string) {
    const [local, domain] = input.split("@");
    if (!local || !domain) return input;
    if (local.length <= 2) return `${local[0] ?? "*"}*@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  async function onResendVerification() {
    setLoading(true);
    setMsg(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: sentToEmail || email.trim().toLowerCase(),
      });
      if (error) throw error;
      setMsg("Verification email sent again.");
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  }

  function onBackStep() {
    if (step === "profile") {
      setStep("password");
      return;
    }
    if (step === "password") {
      setStep("email");
    }
  }

  return (
    <main className="authPage">
      <div className="authPanel">
        <div className="topNav">
          {step !== "email" && !signupComplete ? (
            <button
              type="button"
              className="backIconButton"
              onClick={onBackStep}
              aria-label="Back to previous step"
            >
              ←
            </button>
          ) : null}
        </div>

        <h1 className="authTitle">Sign up</h1>
        <p className="authKicker">New here? Let's make this fun.</p>
        <p className="authSubtitle">Start your first group gift in minutes.</p>

        {signupComplete ? (
          <div style={{ marginTop: 14 }}>
            <p className="muted">
              Check your email to verify your account.
            </p>
            <p className="muted" style={{ marginTop: 8 }}>
              Sent to: <strong>{maskEmail(sentToEmail)}</strong>
            </p>
            <div className="authActions">
              <button type="button" className="primary" onClick={onResendVerification} disabled={loading}>
                {loading ? "Working..." : "Resend email"}
              </button>
              <Link href="/login">
                <button type="button">Back to login</button>
              </Link>
            </div>
          </div>
        ) : (
        <form
          style={{ marginTop: 12 }}
          onSubmit={step === "email" ? onNextEmail : step === "password" ? onNextPassword : onSignup}
        >
          {step === "email" ? (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </>
          ) : null}

          {step === "password" ? (
            <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </>
          ) : null}

          {step === "profile" ? (
            <>
              <label htmlFor="fullName">Name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <label htmlFor="dob">Date of Birth</label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />

              <label className="consentRow" htmlFor="consent">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>I agree to the terms and consent policy.</span>
              </label>
            </>
          ) : null}

          <div className="authActions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Working..." : step === "profile" ? "Sign Up" : "Next"}
            </button>
            {step === "email" ? (
              <div className="authAltAction">
                <p className="authAltLabel">or</p>
                <Link href="/login">
                  <button type="button">Log in</button>
                </Link>
              </div>
            ) : (
              <div className="authAltAction">
                <p className="authAltLabel">or</p>
                <button type="button" onClick={onBackStep} disabled={loading}>
                  Previous
                </button>
              </div>
            )}
          </div>
        </form>
        )}

        {msg ? (
          <p className={msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("please") ? "error" : "muted"}>
            {msg}
          </p>
        ) : null}
      </div>
    </main>
  );
}
