"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CreateGiftResponse = {
  giftId: string;
  invitationLink?: {
    id: string;
    giftId: string;
    token: string;
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    url: string;
  };
};

function toCents(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export default function NewGiftPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const totalPriceCents = toCents(totalPrice);
    if (!totalPriceCents) {
      setError("Enter a valid total price greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/backend/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          totalPriceCents,
          currency: currency.trim().toLowerCase(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create gift");

      const data = json as CreateGiftResponse;
      router.push(`/gifts/${data.giftId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create gift");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginTop: 0 }}>
          <h1 className="title" style={{ marginBottom: 0 }}>
            Create Gift
          </h1>
          <Link href="/gifts">
            <button>Back to Gifts</button>
          </Link>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
          <label htmlFor="name">Gift Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="James Birthday Gift"
            required
          />

          <label htmlFor="totalPrice">Total Price (USD)</label>
          <input
            id="totalPrice"
            type="number"
            step="0.01"
            min="0.01"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            placeholder="120.00"
            required
          />

          <label htmlFor="currency">Currency</label>
          <input
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="usd"
            required
          />

          <div className="row">
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Gift"}
            </button>
          </div>
        </form>

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
