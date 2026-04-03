"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { authedFetch } from "../../../lib/authed-fetch";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";

type GiftDetailPayload = {
  ok: true;
  gift: {
    id: string;
    name: string;
    currency: string;
    totalPriceCents: number;
    splitLockedAt: string | null;
    createdAt: string;
  };
  summary: {
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
      remainingCents: number;
    };
    perPersonPreviewCents: number | null;
  };
  invitees: Array<{
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    status: string;
    amountCents: number | null;
    createdAt: string;
    paidAt: string | null;
  }>;
};

type LatestInvitationLinkPayload = {
  ok: true;
  invitationLink: {
    id: string;
    giftId: string;
    token: string;
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    url: string;
  };
};

function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function titleForStatus(status: string) {
  if (status === "invited") return "Invited";
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  if (status === "checkout_created") return "Checkout Created";
  if (status === "paid") return "Paid";
  if (status === "expired") return "Expired";
  if (status === "canceled") return "Canceled";
  return status;
}

function participantStatusLabel(status: string, splitLockedAt: string | null) {
  if (status === "declined") return "Declined";
  if (status === "canceled") return "Canceled";
  if (status === "expired") return "Expired";
  if (!splitLockedAt) return "Accepted";
  return status === "paid" ? "Paid" : "Not paid";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function GiftStatusPage({ params }: { params: { giftId: string } }) {
  const router = useRouter();
  const giftId = params.giftId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GiftDetailPayload | null>(null);
  const [sending, setSending] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string>("");
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  async function loadGift() {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`/backend/gifts/${giftId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load gift");
      setData(json as GiftDetailPayload);
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes("Not authenticated") || e.message.includes("401"))
      ) {
        router.replace("/");
        return;
      }
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadLatestInvitationLink() {
    try {
      const res = await authedFetch(`/backend/gifts/${giftId}/invitation-links/latest`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load invitation link");
      const payload = json as LatestInvitationLinkPayload;
      setInvitationUrl(payload.invitationLink.url);
    } catch {
      setInvitationUrl("");
    }
  }

  useEffect(() => {
    void loadGift();
    void loadLatestInvitationLink();
  }, [giftId, router]);

  const grouped = useMemo(() => {
    const map = new Map<string, GiftDetailPayload["invitees"]>();
    for (const inv of data?.invitees ?? []) {
      const arr = map.get(inv.status) ?? [];
      arr.push(inv);
      map.set(inv.status, arr);
    }
    return map;
  }, [data]);

  async function onLockAndSend() {
    setSending(true);
    setActionMsg(null);
    try {
      const res = await authedFetch(`/backend/gifts/${giftId}/lock-and-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to lock and send");
      setActionMsg("Lock and send complete.");
      await loadGift();
      await loadLatestInvitationLink();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed to lock and send");
    } finally {
      setSending(false);
    }
  }

  async function onCopyLink() {
    let urlToCopy = invitationUrl;
    try {
      if (!urlToCopy) {
        const createRes = await authedFetch(`/backend/gifts/${giftId}/invitation-links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const createJson = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createJson.error ?? "Failed to create invitation link");
        }

        const createdUrl = createJson?.invitationLink?.url;
        if (!createdUrl) throw new Error("Invitation link URL missing");
        urlToCopy = createdUrl;
        setInvitationUrl(createdUrl);
      }

      await navigator.clipboard.writeText(urlToCopy);
      setCopyMsg("Invitation URL copied.");
    } catch {
      setCopyMsg("Failed to copy invitation URL.");
    }
  }

  async function onSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="figmaDashboardShell">
        <section className="figmaDetailWrap">
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

  if (error || !data) {
    return (
      <main className="figmaDashboardShell">
        <section className="figmaDetailWrap">
          <div className="figmaLoadingCard">
            <h1>Gift Status</h1>
            <p className="figmaMessageError">{error ?? "Failed to load gift"}</p>
            <Link href="/gifts">
              <button className="figmaGhostButton" type="button">
                Back to Gifts
              </button>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const currency = data.gift.currency;
  const progress = data.summary.counts.invited
    ? Math.min(100, Math.round((data.summary.counts.paid / data.summary.counts.invited) * 100))
    : 0;
  const unpaidCount = data.gift.splitLockedAt
    ? data.invitees.filter(
        (inv) =>
          inv.status !== "paid" &&
          inv.status !== "declined" &&
          inv.status !== "canceled" &&
          inv.status !== "expired",
      ).length
    : 0;

  return (
    <main className="figmaDashboardShell">
      <div className="figmaFullBleedNav">
        <nav className="figmaNav">
          <Link href="/" className="figmaBrand">
            <span className="figmaBrandMark">C</span>
            <span className="figmaBrandWord">ChipIn</span>
          </Link>
          <div className="figmaNavActions">
            <Link href="/gifts">
              <button className="figmaGhostButton" type="button">
                Back to Gifts
              </button>
            </Link>
            <button className="figmaGhostButton" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </nav>
      </div>

      <section className="figmaDetailWrap">
        <header className="figmaDetailHeader">
          <div>
            <p className="figmaDashboardKicker">Gift management</p>
            <h1>{data.gift.name}</h1>
            <p>
              Manage the invitation link, monitor payment progress, and review each
              participant response in one place.
            </p>
          </div>
        </header>

        <div className="figmaDetailStats">
          <div className="figmaStatCard">
            <span>Total Amount</span>
            <strong>{formatMoney(data.gift.totalPriceCents, currency)}</strong>
          </div>
          <div className="figmaStatCard">
            <span>Per Person</span>
            <strong>{formatMoney(data.summary.perPersonPreviewCents, currency)}</strong>
          </div>
          <div className="figmaStatCard">
            <span>Status</span>
            <strong>{data.gift.splitLockedAt ? "Locked" : "Open"}</strong>
          </div>
        </div>

        <div className="figmaDetailGrid">
          <section className="figmaDetailMainCard">
            <div className="figmaDetailSectionTop">
              <div>
                <p className="figmaGiftLabel">Payment progress</p>
                <h2>
                  {data.summary.counts.paid}/{data.summary.counts.invited} paid
                </h2>
              </div>
              <button
                className="figmaGhostButton"
                type="button"
                onClick={() => {
                  void loadGift();
                  void loadLatestInvitationLink();
                }}
                disabled={loading || sending}
              >
                Refresh
              </button>
            </div>

            <div className="figmaProgressTrack figmaDetailProgress">
              <div className="figmaProgressFill" style={{ width: `${progress}%` }} />
            </div>

            <div className="figmaDetailMetaGrid">
              <div>
                <span>Assigned</span>
                <strong>{formatMoney(data.summary.amounts.assignedTotalCents, currency)}</strong>
              </div>
              <div>
                <span>Paid</span>
                <strong>{formatMoney(data.summary.amounts.paidTotalCents, currency)}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong>{formatMoney(data.summary.amounts.remainingCents, currency)}</strong>
              </div>
            </div>

            <div className="figmaLinkCard">
              <p className="figmaGiftLabel">Share this link</p>
              <div className="figmaLinkRow">
                <div className="figmaLinkValue">
                  {invitationUrl || "Generate or copy the latest invitation link."}
                </div>
                <button className="figmaGhostButton" type="button" onClick={onCopyLink}>
                  Copy
                </button>
              </div>
            </div>

            {!data.gift.splitLockedAt ? (
              <div className="figmaDetailActionCard">
                <p className="figmaGiftSummary">
                  When you&apos;re ready, lock the split and send payment links to everyone.
                </p>
                <button
                  className="figmaPrimaryButton figmaWideButton"
                  type="button"
                  onClick={onLockAndSend}
                  disabled={sending}
                >
                  {sending ? "Locking..." : "Lock and Send"}
                </button>
              </div>
            ) : null}

            {copyMsg ? (
              <p className={copyMsg.toLowerCase().includes("copied") ? "figmaMessageInfo" : "figmaMessageError"}>
                {copyMsg}
              </p>
            ) : null}
            {actionMsg ? (
              <p className={actionMsg.toLowerCase().includes("complete") ? "figmaMessageInfo" : "figmaMessageError"}>
                {actionMsg}
              </p>
            ) : null}
          </section>

          <aside className="figmaDetailSideCard">
            <h2>Summary</h2>
            <div className="figmaSummaryList">
              <div><span>Invited</span><strong>{data.summary.counts.invited}</strong></div>
              <div><span>Accepted</span><strong>{data.summary.counts.accepted}</strong></div>
              <div><span>Declined</span><strong>{data.summary.counts.declined}</strong></div>
              <div><span>Checkout Created</span><strong>{data.summary.counts.checkoutCreated}</strong></div>
              <div><span>Paid</span><strong>{data.summary.counts.paid}</strong></div>
            </div>
          </aside>
        </div>

        {data.gift.splitLockedAt && unpaidCount > 0 ? (
          <section className="figmaReminderCard">
            <div>
              <h2>
                {unpaidCount} {unpaidCount === 1 ? "person hasn't" : "people haven't"} paid yet
              </h2>
              <p>Send a friendly reminder to help them remember</p>
            </div>
            <button
              className="figmaReminderButton"
              type="button"
              onClick={() => setActionMsg("Reminder sending isn't wired up yet.")}
            >
              <Send size={16} />
              Send Reminders
            </button>
          </section>
        ) : null}

        <section className="figmaInviteeSections">
          <div className="figmaInviteeGroup">
            <div className="figmaDetailSectionTop">
              <div>
                <p className="figmaGiftLabel">Participants</p>
                <h2>{data.invitees.length} participant{data.invitees.length === 1 ? "" : "s"}</h2>
              </div>
            </div>

            {data.invitees.length ? (
              <div className="figmaInviteeList">
                {data.invitees.map((inv) => (
                  <article key={inv.id} className="figmaInviteeRow">
                    <div className="figmaInviteeAvatar">
                      {(inv.name || inv.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="figmaInviteeContent">
                      <p className="figmaInviteeName">{inv.name || "(No name)"}</p>
                      <p className="figmaInviteeEmail">{inv.email}</p>
                      <p className="figmaInviteePhone">{inv.phone || "-"}</p>
                    </div>
                    <div className="figmaInviteeStatusWrap">
                      <span className="figmaInviteeStatusBadge">
                        {participantStatusLabel(inv.status, data.gift.splitLockedAt)}
                      </span>
                      {data.gift.splitLockedAt &&
                      inv.status !== "paid" &&
                      inv.status !== "declined" &&
                      inv.status !== "canceled" &&
                      inv.status !== "expired" ? (
                        <button
                          className="figmaInviteeReminderButton"
                          type="button"
                          onClick={() => setActionMsg(`Reminder for ${inv.email} isn't wired up yet.`)}
                        >
                          <Send size={14} />
                          Remind
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="figmaGiftSummary">Share the invitation link to start collecting responses.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
