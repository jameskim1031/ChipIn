 "use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function loadSession() {
      const sessionRes = await supabase.auth.getSession();
      setIsAuthed(Boolean(sessionRes.data.session));
    }
    void loadSession();
  }, []);

  async function onSignIn(e: FormEvent) {
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
      setIsAuthed(true);
      setMsg("Signed in.");
    } catch (err: any) {
      setMsg(err?.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setMsg("Check your email to confirm sign-up.");
    } catch (err: any) {
      setMsg(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAuthed(false);
    setMsg("Signed out.");
  }

  return (
    <main className="container">
      <div className="card">
        <h1 className="title">ChipIn</h1>
        <p className="muted">Sign in to manage gifts.</p>

        <form style={{ marginTop: 12 }} onSubmit={onSignIn}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="row">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Working..." : "Sign In"}
            </button>
            <button type="button" onClick={onSignUp} disabled={loading}>
              Sign Up
            </button>
            {isAuthed ? (
              <button type="button" onClick={onSignOut} disabled={loading}>
                Sign Out
              </button>
            ) : null}
          </div>
        </form>

        <div className="row">
          <Link href="/gifts">
            <button>Go to Gifts</button>
          </Link>
        </div>

        {msg ? <p className="muted">{msg}</p> : null}
      </div>
    </main>
  );
}
