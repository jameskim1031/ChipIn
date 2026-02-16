"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

export default function GiftStatusPage({ params }: { params: { giftId: string } }) {
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
      const res = await fetch(`/backend/gifts/${giftId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load gift");
      setData(json as GiftDetailPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadLatestInvitationLink() {
    try {
      const res = await fetch(`/backend/gifts/${giftId}/invitation-links/latest`);
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
  }, [giftId]);

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
      const res = await fetch(`/backend/gifts/${giftId}/lock-and-send`, {
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
        const createRes = await fetch(`/backend/gifts/${giftId}/invitation-links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const createJson = await createRes.json();
        if (!createRes.ok)
          throw new Error(createJson.error ?? "Failed to create invitation link");

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

  if (loading) {
    return (
      <main className="container">
        <div className="card">Loading gift status...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container">
        <div className="card">
          <h1 className="title">Gift Status</h1>
          <p className="error">{error ?? "Failed to load gift"}</p>
          <Link href="/gifts">
            <button>Back to Gifts</button>
          </Link>
        </div>
      </main>
    );
  }

  const currency = data.gift.currency;

  return (
    <main className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginTop: 0 }}>
          <h1 className="title" style={{ marginBottom: 0 }}>
            {data.gift.name}
          </h1>
          <Link href="/gifts">
            <button>Back to Gifts</button>
          </Link>
        </div>

        <p className="muted">
          Total: {formatMoney(data.gift.totalPriceCents, currency)} | Locked:{" "}
          {data.gift.splitLockedAt ? "Yes" : "No"}
        </p>
        <p className="muted">
          Per-person preview:{" "}
          {formatMoney(data.summary.perPersonPreviewCents, currency)}
        </p>
        <p className="muted">
          Assigned: {formatMoney(data.summary.amounts.assignedTotalCents, currency)} |
          Paid: {formatMoney(data.summary.amounts.paidTotalCents, currency)} |
          Remaining: {formatMoney(data.summary.amounts.remainingCents, currency)}
        </p>
        <p className="muted">
          Invited {data.summary.counts.invited} | Accepted{" "}
          {data.summary.counts.accepted} | Declined {data.summary.counts.declined} |
          Checkout Created {data.summary.counts.checkoutCreated} | Paid{" "}
          {data.summary.counts.paid}
        </p>

        <div className="row">
          <button onClick={onCopyLink}>Copy Join URL</button>
        </div>
        {copyMsg && (
          <p className={copyMsg.toLowerCase().includes("copied") ? "success" : "error"}>
            {copyMsg}
          </p>
        )}

        <div className="row">
          <button className="primary" onClick={onLockAndSend} disabled={sending}>
            {sending ? "Locking..." : "Lock and Send"}
          </button>
          <button
            onClick={() => {
              void loadGift();
              void loadLatestInvitationLink();
            }}
            disabled={loading || sending}
          >
            Refresh
          </button>
        </div>

        {actionMsg && (
          <p className={actionMsg.toLowerCase().includes("complete") ? "success" : "error"}>
            {actionMsg}
          </p>
        )}

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {(Array.from(grouped.keys()).length ? Array.from(grouped.keys()) : ["none"]).map(
            (status) => {
              if (status === "none") {
                return (
                  <div key="none" className="card" style={{ padding: 14 }}>
                    <p className="muted">No invitees yet.</p>
                  </div>
                );
              }

              const invitees = grouped.get(status) ?? [];
              return (
                <div key={status} className="card" style={{ padding: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {titleForStatus(status)} ({invitees.length})
                  </h3>
                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    {invitees.map((inv) => (
                      <div
                        key={inv.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: 10,
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {inv.name || "(No name)"} - {inv.email}
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          Phone: {inv.phone || "-"} | Amount:{" "}
                          {formatMoney(inv.amountCents, currency)}
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          Paid At: {inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </main>
  );
}
