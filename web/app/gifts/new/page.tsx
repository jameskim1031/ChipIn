"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Gift,
  ImageIcon,
  Smile,
} from "lucide-react";
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
  const [eventDate, setEventDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [iconMode, setIconMode] = useState<"emoji" | "image">("emoji");
  const [selectedEmoji, setSelectedEmoji] = useState("🎁");
  const [imageName, setImageName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultEmojis = ["🎂", "🎁", "💐", "🎓", "🎉", "💍", "🎈", "🌟", "🎊", "🥳", "🎀", "💝"];

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
    <main className="figmaDashboardShell">
      <nav className="figmaFullBleedNav">
        <div className="figmaNav figmaCreateNav">
          <div className="figmaCreateNavLeft">
            <Link href="/gifts">
              <button className="figmaGhostIconButton" type="button" aria-label="Back to gifts">
                <ArrowLeft size={18} />
              </button>
            </Link>
            <div className="figmaCreateNavTitle">
              <div className="figmaCreateNavIcon">
                <Gift size={18} />
              </div>
              <h1>Create New Gift</h1>
            </div>
          </div>
        </div>
      </nav>

      <section className="figmaCreateWrap">
        <div className="figmaCreateCard">
          <div className="figmaCreateIntro">
            <h1>Let&apos;s set up your group gift! 🎁</h1>
            <p>
              Fill in the details and we&apos;ll create a shareable link for everyone to join
            </p>
          </div>

          <form onSubmit={onSubmit} className="figmaCreateForm">
            <div className="figmaFormBlock">
              <label className="figmaFieldLabelWithIcon">
                <Smile size={16} />
                Gift Icon
              </label>
              <div className="figmaModeToggle">
                <button
                  className={iconMode === "emoji" ? "isActive" : ""}
                  type="button"
                  onClick={() => setIconMode("emoji")}
                >
                  <Smile size={16} />
                  Emoji
                </button>
                <button
                  className={iconMode === "image" ? "isActive" : ""}
                  type="button"
                  onClick={() => setIconMode("image")}
                >
                  <ImageIcon size={16} />
                  Custom Image
                </button>
              </div>

              {iconMode === "emoji" ? (
                <div className="figmaEmojiGrid">
                  {defaultEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      className={selectedEmoji === emoji ? "isActive" : ""}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="figmaUploadPanel figmaImageDrop">
                  <ImageIcon size={36} />
                  <p className="figmaFormHint">Upload a custom image for this gift</p>
                  <label className="figmaUploadButton" htmlFor="giftImage">
                    Choose Image
                  </label>
                  <input
                    className="figmaHiddenInput"
                    id="giftImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageName(e.target.files?.[0]?.name ?? "")}
                  />
                  {imageName ? <p className="figmaUploadSuccess">✓ {imageName}</p> : null}
                </div>
              )}
            </div>

            <div className="figmaFormBlock">
              <label className="figmaFieldLabelWithIcon" htmlFor="name">
                <Gift size={16} />
                Gift Name
              </label>
              <input
                className="figmaInput"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sarah's Birthday Gift"
                required
              />
              <p className="figmaFormHint">This is what everyone will see when they join</p>
            </div>

            <div className="figmaFormBlock">
              <label className="figmaFieldLabelWithIcon" htmlFor="totalPrice">
                <DollarSign size={16} />
                Total Gift Price
              </label>
              <div className="figmaCurrencyField">
                <span>$</span>
                <input
                  className="figmaInput figmaCurrencyInput"
                  id="totalPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="250"
                  required
                />
              </div>
              <p className="figmaFormHint">This will be split equally among all participants</p>
            </div>

            <div className="figmaCreateGrid">
              <div className="figmaFormBlock">
                <label className="figmaFieldLabelWithIcon" htmlFor="eventDate">
                  <Calendar size={16} />
                  Birthday / Event Date
                </label>
                <input
                  className="figmaInput"
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
                <p className="figmaFormHint">When is the special day?</p>
              </div>

              <div className="figmaFormBlock">
                <label className="figmaFieldLabelWithIcon" htmlFor="deadline">
                  <Clock size={16} />
                  Payment Deadline
                </label>
                <input
                  className="figmaInput"
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <p className="figmaFormHint">Everyone needs to pay by this date</p>
              </div>
            </div>

            <div className="figmaFormBlock">
              <label className="figmaFieldLabelWithIcon" htmlFor="currency">
                <DollarSign size={16} />
                Currency
              </label>
              <input
                className="figmaInput"
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="usd"
                required
              />
            </div>

            <div className="figmaWhatNext">
              <h2>✨ What happens next?</h2>
              <ul className="figmaBulletList">
                <li>You&apos;ll get a shareable link to send to friends</li>
                <li>People can join and see their share amount</li>
                <li>When ready, you can lock it in and send payment links</li>
              </ul>
            </div>

            <div className="figmaCreateActions">
              <button className="figmaPrimaryButton figmaWideButton" type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Gift 🎉"}
              </button>
            </div>
            <Link href="/gifts" className="figmaCreateCancelLink">
              Cancel
            </Link>
          </form>

          {error ? <p className="figmaMessageError">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
