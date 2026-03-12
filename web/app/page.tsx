"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

export default function HomePage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    async function loadSession() {
      const sessionRes = await supabase.auth.getSession();
      setIsAuthed(Boolean(sessionRes.data.session));
    }
    void loadSession();
  }, []);

  async function onSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAuthed(false);
    router.replace("/");
  }

  return (
    <main className="marketingPage">
      <div className="marketingNav">
        <Link href="/" className="brandLink">
          <span className="brandMark">C</span>
          <span className="brandWord">ChipIn</span>
        </Link>

        <div className="navActions">
          {isAuthed ? (
            <>
              <Link href="/gifts">
                <button className="navPrimary" type="button">Go to Gifts</button>
              </Link>
              <button className="navGhost" type="button" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="navGhost" type="button">Log in</button>
              </Link>
              <Link href="/signup">
                <button className="navPrimary" type="button">Sign up</button>
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="marketingHero">
        <p className="eyebrow">Group gifts, made easy and memorable</p>
        <h1>Turn every gift into a shared moment.</h1>
        <p className="heroBody">
          Build surprise energy, keep everyone in the loop, and make paying in feel
          effortless.
        </p>
        <div className="marketingMoodRow">
          <span>Birthday drops</span>
          <span>Custom surprises</span>
          <span>Group energy only</span>
        </div>
        <div className="heroActions">
          <Link href="/login">
            <button className="heroPrimary" type="button">Start a group gift now</button>
          </Link>
          <Link href="/signup">
            <button className="heroSecondary" type="button">Create account</button>
          </Link>
        </div>
      </section>
    </main>
  );
}
