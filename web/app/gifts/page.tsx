"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "../../lib/authed-fetch";
import { getSupabaseBrowserClient } from "../../lib/supabase-browser";

type GiftListPayload = {
  ok: true;
  gifts: Array<{
    id: string;
    name: string;
    currency: string;
    totalPriceCents: number;
    splitLockedAt: string | null;
    createdAt: string;
    counts: {
      invited: number;
      accepted: number;
      declined: number;
      checkoutCreated: number;
      paid: number;
    };
    amounts: {
      assignedTotalCents: number;
      paidTotalCents: number;
    };
  }>;
};

type GiftImageClass =
  | "giftsImageBirthday"
  | "giftsImageCustom"
  | "giftsImageGraduation"
  | "giftsImageHousewarming";

type TimelineEvent = {
  dateLabel: string;
  title: string;
  eventType: string;
  status: string;
  imageClass: GiftImageClass;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatMonthDay(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

const GIFT_IMAGE_CLASSES: GiftImageClass[] = [
  "giftsImageBirthday",
  "giftsImageCustom",
  "giftsImageGraduation",
  "giftsImageHousewarming",
];

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    dateLabel: "Apr 12",
    title: "Maya's Birthday",
    eventType: "Birthday event",
    status: "Gift collection opens in 2 days",
    imageClass: "giftsImageBirthday",
  },
  {
    dateLabel: "Apr 20",
    title: "Team Retreat",
    eventType: "Custom event",
    status: "Gift collection opens in 1 week",
    imageClass: "giftsImageCustom",
  },
];

function getDisplayNameFromSession(session: any) {
  const fullName = session?.user?.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }

  const email = session?.user?.email;
  if (typeof email === "string" && email.includes("@")) {
    return email.split("@")[0];
  }

  return "there";
}

export default function GiftsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GiftListPayload | null>(null);
  const [displayName, setDisplayName] = useState("there");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabaseBrowserClient();
        const sessionRes = await supabase.auth.getSession();
        if (mounted) setDisplayName(getDisplayNameFromSession(sessionRes.data.session));

        const res = await authedFetch("/backend/gifts");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load gifts");
        if (mounted) setData(json as GiftListPayload);
      } catch (e) {
        if (
          e instanceof Error &&
          (e.message.includes("Not authenticated") || e.message.includes("401"))
        ) {
          router.replace("/");
          return;
        }
        if (mounted) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  const gifts = useMemo(() => data?.gifts ?? [], [data]);
  const isUpcomingTab = activeTab === "upcoming";
  const displayedGifts = isUpcomingTab ? gifts : [];
  const activeGiftCount = gifts.filter((gift) => !gift.splitLockedAt || gift.counts.paid < gift.counts.invited).length;
  const paidGiftCount = gifts.filter((gift) => gift.counts.invited > 0 && gift.counts.paid === gift.counts.invited).length;

  if (loading) {
    return (
      <main className="figmaDashboardShell">
        <nav className="figmaNav">
          <Link href="/" className="figmaBrand">
            <span className="figmaBrandMark">C</span>
            <span className="figmaBrandWord">ChipIn</span>
          </Link>
        </nav>
        <section className="figmaDashboardWrap">
          <div className="figmaLoadingCard figmaLoadingState">
            <div className="figmaLoadingDots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="figmaLoadingLabel">Loading</p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="figmaDashboardShell">
        <nav className="figmaNav">
          <Link href="/" className="figmaBrand">
            <span className="figmaBrandMark">C</span>
            <span className="figmaBrandWord">ChipIn</span>
          </Link>
        </nav>
        <section className="figmaDashboardWrap">
          <div className="figmaLoadingCard">
            <h1>Gift Hub</h1>
            <p className="figmaMessageError">{error}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="figmaDashboardShell">
      <nav className="figmaFullBleedNav">
        <div className="figmaNav">
          <Link href="/" className="figmaBrand">
            <span className="figmaBrandMark">C</span>
            <span className="figmaBrandWord">ChipIn</span>
          </Link>
          <div className="figmaNavActions">
            <Link href="/gifts/new">
              <button className="figmaPrimaryButton" type="button">
                New Gift
              </button>
            </Link>
            <button className="figmaGhostButton" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <section className="figmaDashboardWrap">
        <header className="figmaDashboardHeader">
          <div>
            <p className="figmaDashboardKicker">Gift hub</p>
            <h1>Hey, {displayName}.</h1>
            <p>
              Keep every gift, invite, and payment update in one clean dashboard.
            </p>
          </div>
          <div className="figmaDashboardStats">
            <div className="figmaStatCard">
              <span>Active gifts</span>
              <strong>{activeGiftCount}</strong>
            </div>
            <div className="figmaStatCard">
              <span>Completed</span>
              <strong>{paidGiftCount}</strong>
            </div>
          </div>
        </header>

        <div className="figmaDashboardGrid">
          <section className="figmaBoardCard">
            <div className="figmaBoardTop">
              <div className="figmaSegmented" role="tablist" aria-label="Gift timeline tabs">
                <button
                  className={isUpcomingTab ? "isActive" : ""}
                  type="button"
                  role="tab"
                  aria-selected={isUpcomingTab}
                  onClick={() => setActiveTab("upcoming")}
                >
                  Active ({gifts.length})
                </button>
                <button
                  className={!isUpcomingTab ? "isActive" : ""}
                  type="button"
                  role="tab"
                  aria-selected={!isUpcomingTab}
                  onClick={() => setActiveTab("past")}
                >
                  Completed ({paidGiftCount})
                </button>
              </div>
              <Link href="/gifts/new">
                <button className="figmaPrimaryButton" type="button">
                  New gift
                </button>
              </Link>
            </div>

            {displayedGifts.length === 0 ? (
              <div className="figmaEmptyState">
                <h2>{isUpcomingTab ? "No active gifts yet" : "No completed gifts yet"}</h2>
                <p>
                  {isUpcomingTab
                    ? "Create your first group gift to start collecting contributions."
                    : "Completed gifts will appear here once everyone has paid."}
                </p>
                {isUpcomingTab ? (
                  <Link href="/gifts/new">
                    <button className="figmaPrimaryButton" type="button">
                      Create Gift
                    </button>
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="figmaGiftList">
                {displayedGifts.map((gift, index) => {
                  const imageClass = GIFT_IMAGE_CLASSES[index % GIFT_IMAGE_CLASSES.length];
                  const progress = gift.counts.invited
                    ? Math.min(100, Math.round((gift.counts.paid / gift.counts.invited) * 100))
                    : 0;

                  return (
                    <Link key={gift.id} href={`/gifts/${gift.id}`} className="figmaGiftRowLink">
                      <article className="figmaGiftRowCard">
                        <div className={`figmaGiftThumb ${imageClass}`} />
                        <div className="figmaGiftRowBody">
                          <div className="figmaGiftRowTop">
                            <div>
                              <p className="figmaGiftLabel">
                                {gift.splitLockedAt ? "Locked gift" : "Open gift"}
                              </p>
                              <h3>{gift.name}</h3>
                            </div>
                            <span className="figmaGiftDate">{formatMonthDay(gift.createdAt)}</span>
                          </div>

                          <div className="figmaGiftMeta">
                            <span>{formatMoney(gift.totalPriceCents, gift.currency)}</span>
                            <span>{gift.counts.invited} invited</span>
                            <span>{gift.counts.paid} paid</span>
                          </div>

                          <div className="figmaProgressTrack figmaGiftTrack">
                            <div className="figmaProgressFill" style={{ width: `${progress}%` }} />
                          </div>

                          <p className="figmaGiftSummary">
                            Accepted {gift.counts.accepted} • Declined {gift.counts.declined} •
                            Payment links {gift.counts.checkoutCreated}
                          </p>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="figmaSideBoard">
            <div className="figmaBoardTop">
              <div>
                <p className="figmaSideKicker">Events</p>
                <h2>Coming up</h2>
              </div>
              <button className="figmaGhostButton" type="button">
                Add event
              </button>
            </div>

            <div className="figmaEventList">
              {TIMELINE_EVENTS.map((event) => (
                <article key={event.title} className="figmaEventCard">
                  <div className={`figmaGiftThumb figmaEventThumb ${event.imageClass}`} />
                  <div>
                    <span className="figmaGiftDate">{event.dateLabel}</span>
                    <p className="figmaGiftLabel">{event.eventType}</p>
                    <h3>{event.title}</h3>
                    <p className="figmaGiftSummary">{event.status}</p>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
