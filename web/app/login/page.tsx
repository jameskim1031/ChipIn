"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";
import { AuthLayout } from "../components/auth-layout";

type LoginStep = "email" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthLayout cardClassName="figmaLoginCard">
        <div className="figmaAuthHeader">
          <h2>Welcome back! 👋</h2>
          <p>Log in to pick up where you left off</p>
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
              <div className="figmaPasswordField">
                <input
                  className="figmaInput figmaPasswordInput"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="figmaPasswordToggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
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
    </AuthLayout>
  );
}
