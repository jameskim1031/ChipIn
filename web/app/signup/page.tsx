"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";
import { AuthLayout } from "../components/auth-layout";

type SignupStep = "email" | "password" | "profile";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthLayout
      footer={
        <p className="figmaOnboardingFooter">
          By continuing, you agree to our Terms &amp; Privacy Policy
        </p>
      }
      showBackLink={false}
    >
          {step !== "email" && !signupComplete ? (
            <button
              type="button"
              className="figmaBackLinkButton"
              onClick={onBackStep}
              aria-label="Back to previous step"
            >
              ← Back
            </button>
          ) : (
            <Link href="/" className="figmaBackLink">
              ← Back to home
            </Link>
          )}

          {signupComplete ? (
            <div className="figmaSuccessPanel">
              <h2>Check your email</h2>
              <p>
                We sent a verification link to <strong>{maskEmail(sentToEmail)}</strong>.
              </p>
              <div className="figmaAuthActions">
                <button
                  type="button"
                  className="figmaPrimaryButton figmaWideButton"
                  onClick={onResendVerification}
                  disabled={loading}
                >
                  {loading ? "Working..." : "Resend email"}
                </button>
                <Link href="/login">
                  <button className="figmaGhostButton figmaWideButton" type="button">
                    Back to login
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="figmaAuthHeader figmaSignupHeader">
                <h2>Welcome! 👋</h2>
                <p>Let&apos;s get you set up in seconds</p>
              </div>

              <form
                className="figmaAuthForm figmaSignupForm"
                onSubmit={step === "email" ? onNextEmail : step === "password" ? onNextPassword : onSignup}
              >
                {step === "email" ? (
                  <div className="figmaFieldGroup">
                    <label htmlFor="email">Email</label>
                    <input
                      className="figmaInput"
                      id="email"
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                ) : null}

                {step === "password" ? (
                  <div className="figmaFieldGroup">
                    <label htmlFor="password">Password</label>
                    <div className="figmaPasswordField">
                      <input
                        className="figmaInput figmaPasswordInput"
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
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
                  </div>
                ) : null}

                {step === "profile" ? (
                  <>
                    <div className="figmaFieldGroup">
                      <label htmlFor="fullName">Your Name</label>
                      <input
                        className="figmaInput"
                        id="fullName"
                        placeholder="Jane Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="figmaFieldGroup">
                      <label htmlFor="dob">Birthday</label>
                      <input
                        className="figmaInput"
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        required
                      />
                    </div>

                    <label className="figmaConsentRow figmaSignupConsent" htmlFor="consent">
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

                <div className="figmaAuthActions">
                  <button className="figmaPrimaryButton figmaWideButton" type="submit" disabled={loading}>
                    {loading ? "Working..." : step === "profile" ? "Let's Go!" : "Continue"}
                  </button>
                  {step === "email" ? (
                    <div className="figmaAltAction">
                      <p className="figmaAltLabel">or</p>
                      <Link href="/login">
                        <button className="figmaGhostButton figmaWideButton" type="button">
                          Log in
                        </button>
                      </Link>
                    </div>
                  ) : (
                    <div className="figmaAltAction">
                      <p className="figmaAltLabel">or</p>
                      <button
                        className="figmaGhostButton figmaWideButton"
                        type="button"
                        onClick={onBackStep}
                        disabled={loading}
                      >
                        Previous
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </>
          )}

          {msg ? (
            <p
              className={
                msg.toLowerCase().includes("failed") || msg.toLowerCase().includes("please")
                  ? "figmaMessageError"
                  : "figmaMessageInfo"
              }
            >
              {msg}
            </p>
          ) : null}
    </AuthLayout>
  );
}
