"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

type LoginStep = "email" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function loadSession() {
      const sessionRes = await supabase.auth.getSession();
      if (sessionRes.data.session) router.replace("/gifts");
    }
    void loadSession();
  }, [router]);

  function onContinueEmail(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) {
      setMsg("Please enter your email.");
      return;
    }
    setStep("password");
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.replace("/gifts");
    } catch (err: any) {
      setMsg(err?.message ?? "Log in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="figmaAuthShell">
      <div className="figmaAuthCard">
        <Link href="/" className="figmaBackLink">
          ← Back to home
        </Link>

        <div className="figmaAuthHeader">
          <div className="figmaAuthLogo">C</div>
          <h1>Welcome back</h1>
          <p>Log in to manage your gifts, participants, and payment progress.</p>
        </div>

        <form className="figmaAuthForm" onSubmit={step === "email" ? onContinueEmail : onLogin}>
          <label htmlFor="email">Email</label>
          <input
            className="figmaInput"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {step === "password" ? (
            <>
              <label htmlFor="password">Password</label>
              <input
                className="figmaInput"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </>
          ) : null}

          <div className="figmaAuthActions">
            <button className="figmaPrimaryButton figmaWideButton" type="submit" disabled={loading}>
              {loading ? "Working..." : step === "email" ? "Continue" : "Log In"}
            </button>
            {step === "email" ? (
              <div className="figmaAltAction">
                <p className="figmaAltLabel">or</p>
                <Link href="/signup">
                  <button className="figmaGhostButton figmaWideButton" type="button">
                    Create account
                  </button>
                </Link>
              </div>
            ) : (
              <div className="figmaAltAction">
                <p className="figmaAltLabel">or</p>
                <button
                  className="figmaGhostButton figmaWideButton"
                  type="button"
                  onClick={() => setStep("email")}
                  disabled={loading}
                >
                  Change email
                </button>
              </div>
            )}
          </div>
        </form>

        {msg ? <p className="figmaMessageError">{msg}</p> : null}
      </div>
    </main>
  );
}
