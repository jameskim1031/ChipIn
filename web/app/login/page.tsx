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
    <main className="authPage">
      <div className="authPanel">
        <div className="topNav">
          <Link href="/">
            <button type="button" className="backIconButton" aria-label="Back to home">
              ←
            </button>
          </Link>
        </div>

        <h1 className="authTitle">Log in</h1>
        <p className="authKicker">Jump back into the party plan.</p>
        <p className="authSubtitle">Your group gifts are waiting.</p>

        <form style={{ marginTop: 12 }} onSubmit={step === "email" ? onContinueEmail : onLogin}>
          <label htmlFor="email">Email</label>
          <input
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
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </>
          ) : null}

          <div className="authActions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Working..." : step === "email" ? "Continue" : "Log In"}
            </button>
            {step === "email" ? (
              <div className="authAltAction">
                <p className="authAltLabel">or</p>
                <Link href="/signup">
                  <button type="button">Sign up</button>
                </Link>
              </div>
            ) : (
              <div className="authAltAction">
                <p className="authAltLabel">or</p>
                <button type="button" onClick={() => setStep("email")} disabled={loading}>
                  Change email
                </button>
              </div>
            )}
          </div>
        </form>

        {msg ? <p className="error">{msg}</p> : null}
      </div>
    </main>
  );
}
