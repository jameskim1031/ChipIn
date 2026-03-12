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
    day: "2-digit",
  })
    .format(date)
    .toUpperCase();
}

const GIFT_IMAGE_CLASSES: GiftImageClass[] = [
  "giftsImageBirthday",
  "giftsImageCustom",
  "giftsImageGraduation",
  "giftsImageHousewarming",
];

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    dateLabel: "APR 12",
    title: "Maya's Birthday",
    eventType: "Birthday event",
    status: "Gift collection opens in 2 days",
    imageClass: "giftsImageBirthday",
  },
  {
    dateLabel: "APR 20",
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

  if (loading) {
    return (
      <main className="giftsPage">
        <div className="marketingNav">
          <Link href="/" className="brandLink">
            <span className="brandMark">C</span>
            <span className="brandWord">ChipIn</span>
          </Link>
        </div>
        <section className="giftsShell">
          <div className="giftsSection">
            <p className="giftsEmpty">Loading gifts...</p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="giftsPage">
        <div className="marketingNav">
          <Link href="/" className="brandLink">
            <span className="brandMark">C</span>
            <span className="brandWord">ChipIn</span>
          </Link>
        </div>
        <section className="giftsShell">
          <div className="giftsSection">
            <h1 className="giftsPageTitle">Gifts</h1>
            <p className="error">{error}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="giftsPage">
      <div className="marketingNav">
        <Link href="/" className="brandLink">
          <span className="brandMark">C</span>
          <span className="brandWord">ChipIn</span>
        </Link>
        <div className="navActions">
          <button className="navGhost" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      <section className="giftsShell">
        <header className="giftsHeader">
          <p className="giftsEyebrow">Gift hub</p>
          <h1 className="giftsPageTitle">Welcome back, {displayName}.</h1>
          <p className="giftsSubtitle">
            Build unforgettable moments, rally your people, and make gifting feel
            like part of the party.
          </p>
          <div className="giftsMoodRow">
            <span>Birthday drops</span>
            <span>Custom surprises</span>
            <span>Group energy only</span>
          </div>
        </header>

        <section className="giftsTimelineLayout">
          <div className="giftsTimelineTop">
            <div className="giftsTabs" role="tablist" aria-label="Gift timeline tabs">
              <button
                className={`giftsTabButton ${isUpcomingTab ? "isActive" : ""}`}
                type="button"
                role="tab"
                aria-selected={isUpcomingTab}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming gifts
              </button>
              <button
                className={`giftsTabButton ${!isUpcomingTab ? "isActive" : ""}`}
                type="button"
                role="tab"
                aria-selected={!isUpcomingTab}
                onClick={() => setActiveTab("past")}
              >
                Past gifts
              </button>
            </div>
          </div>

          <div className="giftsColumns">
            <article className="giftsColumn">
              <div className="giftsSectionTop">
                <h2>Gift queue</h2>
                <Link href="/gifts/new">
                  <button className="giftsHeaderActionButton" type="button">
                    Start a gift
                  </button>
                </Link>
              </div>

              {displayedGifts.length === 0 ? (
                <p className="giftsEmpty">
                  {isUpcomingTab ? "No upcoming gifts yet." : "No past gifts yet."}
                </p>
              ) : (
                <div className="giftsList">
                  {displayedGifts.map((gift, index) => {
                    const imageClass = GIFT_IMAGE_CLASSES[index % GIFT_IMAGE_CLASSES.length];
                    return (
                      <div key={gift.id} className="giftsEventCard">
                        <span className="giftsEventDate">{formatMonthDay(gift.createdAt)}</span>
                        <div className={`giftsEventImage ${imageClass}`} />
                        <div className="giftsEventBody">
                          <p className="giftsEventType">
                            {gift.splitLockedAt ? "Locked gift" : "Open gift"}
                          </p>
                          <h3>{gift.name}</h3>
                          <p>Total: {formatMoney(gift.totalPriceCents, gift.currency)}</p>
                          <p>
                            Invited {gift.counts.invited} | Accepted {gift.counts.accepted} |
                            Declined {gift.counts.declined} | Paid {gift.counts.paid}
                          </p>
                          <div className="giftsItemActions">
                            <Link href={`/gifts/${gift.id}`}>
                              <button type="button">View status</button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="giftsColumn">
              <div className="giftsSectionTop">
                <h2>Event board</h2>
                <button className="giftsHeaderActionButton" type="button">
                  Add event
                </button>
              </div>
              <div className="giftsList">
                {TIMELINE_EVENTS.map((event) => (
                  <div key={event.title} className="giftsEventCard">
                    <span className="giftsEventDate">{event.dateLabel}</span>
                    <div className={`giftsEventImage ${event.imageClass}`} />
                    <div className="giftsEventBody">
                      <p className="giftsEventType">{event.eventType}</p>
                      <h3>{event.title}</h3>
                      <p>{event.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
