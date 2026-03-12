"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authedFetch } from "../../../lib/authed-fetch";

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

  useEffect(() => {
    void authedFetch("/backend/gifts")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
      })
      .catch(() => {
        router.replace("/");
      });
  }, [router]);

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
      const res = await authedFetch("/backend/gifts", {
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
    <main className="giftsPage">
      <div className="marketingNav">
        <Link href="/" className="brandLink">
          <span className="brandMark">C</span>
          <span className="brandWord">ChipIn</span>
        </Link>
        <Link href="/gifts">
          <button className="navGhost" type="button">Back to gifts</button>
        </Link>
      </div>

      <section className="giftsShell">
        <header className="giftsHeader">
          <p className="giftsEyebrow">New gift</p>
          <h1 className="giftsPageTitle">Start a new gift drop.</h1>
          <p className="giftsSubtitle">
            Name the moment, set the total, and share it with your people.
          </p>
        </header>

        <section className="newGiftPanel">
          <form onSubmit={onSubmit} className="newGiftForm">
            <label htmlFor="name">Gift Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="James Birthday Gift"
              required
            />

            <div className="newGiftRow">
              <div className="newGiftField">
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
              </div>
              <div className="newGiftField">
                <label htmlFor="currency">Currency</label>
                <input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="usd"
                  required
                />
              </div>
            </div>

            <div className="newGiftUpload">
              <label htmlFor="giftImage">Gift image (optional)</label>
              <input id="giftImage" type="file" accept="image/*" />
              <p className="newGiftUploadHint">
                Image upload is preview-only for now (not saved yet).
              </p>
            </div>

            <div className="newGiftActions">
              <button
                className="giftsHeaderActionButton newGiftPrimary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create gift"}
              </button>
              <Link href="/gifts">
                <button className="giftsHeaderActionButton" type="button">Cancel</button>
              </Link>
            </div>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>
      </section>
    </main>
  );
}
