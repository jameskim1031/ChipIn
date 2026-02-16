"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function GiftsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GiftListPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/backend/gifts");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load gifts");
        if (mounted) setData(json as GiftListPayload);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const gifts = useMemo(() => data?.gifts ?? [], [data]);

  if (loading) {
    return (
      <main className="container">
        <div className="card">Loading gifts...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <div className="card">
          <h1 className="title">Gifts</h1>
          <p className="error">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginTop: 0 }}>
          <h1 className="title" style={{ marginBottom: 0 }}>
            Gifts
          </h1>
          <Link href="/gifts/new">
            <button className="primary">Create New Gift</button>
          </Link>
        </div>

        {gifts.length === 0 ? (
          <p className="muted" style={{ marginTop: 14 }}>
            No gifts yet.
          </p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {gifts.map((gift) => (
              <div key={gift.id} className="card" style={{ padding: 14 }}>
                <div
                  className="row"
                  style={{ justifyContent: "space-between", marginTop: 0 }}
                >
                  <h2 style={{ margin: 0, fontSize: 18 }}>{gift.name}</h2>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {gift.splitLockedAt ? "Locked" : "Open"}
                  </span>
                </div>

                <p className="muted" style={{ marginTop: 8 }}>
                  Total: {formatMoney(gift.totalPriceCents, gift.currency)}
                </p>
                <p className="muted" style={{ marginTop: 6 }}>
                  Invited {gift.counts.invited} | Accepted {gift.counts.accepted} |
                  Declined {gift.counts.declined} | Paid {gift.counts.paid}
                </p>

                <div className="row" style={{ marginTop: 10 }}>
                  <Link href={`/gifts/${gift.id}`}>
                    <button>View Status</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
