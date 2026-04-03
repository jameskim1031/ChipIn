"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle,
  DollarSign,
  Gift,
  Link2,
  Sparkles,
  Users,
} from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";

const TESTIMONIALS = [
  {
    quote:
      "We pulled together a birthday gift in one night. No spreadsheet, no weird follow-ups, just one link.",
    name: "Maya R.",
    role: "Birthday organizer",
  },
  {
    quote:
      "The join flow was simple enough that everyone actually responded. That alone sold me.",
    name: "Chris T.",
    role: "Team gift planner",
  },
  {
    quote:
      "Seeing who had paid and who still needed a nudge made the whole thing feel way less chaotic.",
    name: "Elena P.",
    role: "Frequent organizer",
  },
];

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
    <main className="figmaPageShell">
      <nav className="figmaFullBleedNav">
        <div className="figmaNav">
          <Link href="/" className="figmaBrand">
            <span className="figmaBrandMark">C</span>
            <span className="figmaBrandWord">ChipIn</span>
          </Link>

          <div className="figmaNavActions">
            {isAuthed ? (
              <>
                <Link href="/gifts">
                  <button className="figmaPrimaryButton" type="button">
                    Go to Gifts
                  </button>
                </Link>
                <button className="figmaGhostButton" type="button" onClick={onSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <button className="figmaGhostButton" type="button">
                    Log in
                  </button>
                </Link>
                <Link href="/signup">
                  <button className="figmaPrimaryButton" type="button">
                    Get Started
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="figmaHeroBand">
        <div className="figmaHero">
          <div className="figmaEyebrow">
            <Sparkles size={16} />
            <span>Group gifting made simple</span>
          </div>
          <h1 className="figmaHeroTitle">
            The easiest way to <span>gift together</span>
          </h1>
          <p className="figmaHeroBody">
            Create a group gift, share a link, and collect payments without
            spreadsheets, awkward reminders, or extra friction.
          </p>
          <div className="figmaHeroActions">
            <Link href={isAuthed ? "/gifts" : "/signup"}>
              <button className="figmaPrimaryButton figmaHeroButton" type="button">
                {isAuthed ? "Open Gift Hub" : "Start for Free"}
                <ArrowRight size={18} />
              </button>
            </Link>
            <a href="#how-it-works">
              <button className="figmaGhostButton figmaHeroButton" type="button">
                How it works
              </button>
            </a>
          </div>
          <div className="figmaProofRow">
            <span>
              <CheckCircle size={14} />
              No account needed to join
            </span>
            <span>
              <CheckCircle size={14} />
              Secure payments via Stripe
            </span>
            <span>
              <CheckCircle size={14} />
              Free to start
            </span>
          </div>
          <div className="figmaTestimonialStrip" aria-label="Customer reviews">
            <div className="figmaTestimonialTrack">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
                <article className="figmaTestimonialCard" key={`${testimonial.name}-${index}`}>
                  <p>&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="figmaTestimonialMeta">
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.role}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="figmaFeatureBand" id="how-it-works">
        <div className="figmaFeatureSection">
        <div className="figmaSectionIntro">
          <h2>How it works ✨</h2>
          <p>Three simple steps to make group gifting feel effortless.</p>
        </div>

        <div className="figmaFeatureGrid">
          <article className="figmaFeatureCard">
            <div className="figmaFeatureIcon figmaFeatureIconPink">
              <Gift size={28} />
            </div>
            <div className="figmaFeatureStep figmaFeatureStepPink">1</div>
            <h3>Create a gift</h3>
            <p>Set the name, total amount, and event details. ChipIn handles the structure.</p>
          </article>
          <article className="figmaFeatureCard">
            <div className="figmaFeatureIcon figmaFeatureIconPurple">
              <Link2 size={28} />
            </div>
            <div className="figmaFeatureStep figmaFeatureStepPurple">2</div>
            <h3>Share one link</h3>
            <p>Invite friends with a single join link so they can RSVP without friction.</p>
          </article>
          <article className="figmaFeatureCard">
            <div className="figmaFeatureIcon figmaFeatureIconBlue">
              <DollarSign size={28} />
            </div>
            <div className="figmaFeatureStep figmaFeatureStepBlue">3</div>
            <h3>Track contributions</h3>
            <p>See who joined, who paid, and when the gift is ready to lock and send.</p>
          </article>
        </div>
        </div>
      </section>

      <section className="figmaHighlightBand">
        <div className="figmaHighlightSection">
          <div className="figmaHighlightCopy">
            <h2>Everything you need to organize group gifts</h2>
            <div className="figmaHighlightList">
              <div className="figmaHighlightItem">
                <div className="figmaHighlightIcon">
                  <Users size={18} />
                </div>
                <div>
                  <h3>No account needed to join</h3>
                  <p>Only the organizer needs an account. Everyone else can join with just a link.</p>
                </div>
              </div>
              <div className="figmaHighlightItem">
                <div className="figmaHighlightIcon">
                  <Bell size={18} />
                </div>
                <div>
                  <h3>Smart reminders</h3>
                  <p>Send friendly payment reminders to people who haven't paid yet with one click.</p>
                </div>
              </div>
              <div className="figmaHighlightItem">
                <div className="figmaHighlightIcon">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3>Secure payments</h3>
                  <p>Built on Stripe for secure, reliable payment processing everyone trusts.</p>
                </div>
              </div>
              <div className="figmaHighlightItem">
                <div className="figmaHighlightIcon">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h3>Real-time tracking</h3>
                  <p>See exactly who&apos;s joined and who&apos;s paid in real-time.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="figmaHighlightPanel">
            <div className="figmaMiniCard">
              <div className="figmaMiniCardTop">
                <strong>Sarah&apos;s Birthday Gift 🎂</strong>
                <span>$250 • 8 people</span>
              </div>
              <div className="figmaProgressTrack">
                <div className="figmaProgressFill" style={{ width: "62%" }} />
              </div>
              <p>5 of 8 paid</p>
            </div>
            <div className="figmaMiniList">
              <div>
                <span>John Smith</span>
                <b>Paid ✓</b>
              </div>
              <div>
                <span>Emma Wilson</span>
                <b>Paid ✓</b>
              </div>
              <div>
                <span>Michael Brown</span>
                <em>Pending</em>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
