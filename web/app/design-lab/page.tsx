"use client";

import { useState } from "react";
import styles from "./page.module.css";

type ConceptKey = "pulse" | "editorial" | "arcade";

type Concept = {
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  chips: string[];
};

type EventItem = {
  dateLabel: string;
  title: string;
  eventType: string;
  contributors: string;
  imageClass:
    | "imageBirthday"
    | "imageCustom"
    | "imageGraduation"
    | "imageHousewarming";
};

const CONCEPTS: Record<ConceptKey, Concept> = {
  pulse: {
    label: "Concept A",
    eyebrow: "Neon Pulse",
    title: "Group gifts with nightlife energy.",
    subtitle:
      "Bold gradients, luminous accents, and playful motion for a social-first feel.",
    chips: ["Vibrant", "Animated", "Youthful"],
  },
  editorial: {
    label: "Concept B",
    eyebrow: "Editorial Night",
    title: "Premium and cinematic, still warm.",
    subtitle:
      "High contrast typography, glass cards, and restrained metallic accents.",
    chips: ["Refined", "Cinematic", "Clean"],
  },
  arcade: {
    label: "Concept C",
    eyebrow: "Event Timeline",
    title: "Every gift lives on a shared event timeline.",
    subtitle:
      "Birthday and custom events stay organized with visual cards, dates, and contribution progress.",
    chips: ["Upcoming gifts", "Past gifts"],
  },
};

const ARCADE_UPCOMING_EVENTS: EventItem[] = [
  {
    dateLabel: "APR 12",
    title: "Maya's Birthday Polaroid Fund",
    eventType: "Birthday",
    contributors: "12 invited · 7 chipped in",
    imageClass: "imageBirthday",
  },
  {
    dateLabel: "APR 20",
    title: "Custom: Team Retreat Gift Basket",
    eventType: "Custom event",
    contributors: "9 invited · 4 chipped in",
    imageClass: "imageCustom",
  },
  {
    dateLabel: "MAY 03",
    title: "Graduation Camera + Lens",
    eventType: "Graduation",
    contributors: "16 invited · 10 chipped in",
    imageClass: "imageGraduation",
  },
];

const ARCADE_PAST_GIFTS: EventItem[] = [
  {
    dateLabel: "MAR 01",
    title: "Housewarming Espresso Machine",
    eventType: "Housewarming",
    contributors: "8 invited · Completed",
    imageClass: "imageHousewarming",
  },
  {
    dateLabel: "FEB 18",
    title: "Custom: Farewell Dinner Surprise",
    eventType: "Custom event",
    contributors: "11 invited · Completed",
    imageClass: "imageCustom",
  },
];

const ARCADE_EVENTS: EventItem[] = [
  {
    dateLabel: "APR 12",
    title: "Maya's Birthday",
    eventType: "Birthday event",
    contributors: "Gift collection opens in 2 days",
    imageClass: "imageBirthday",
  },
  {
    dateLabel: "APR 20",
    title: "Team Retreat",
    eventType: "Custom event",
    contributors: "Gift collection opens in 1 week",
    imageClass: "imageCustom",
  },
];

export default function DesignLabPage() {
  const [activeConcept, setActiveConcept] = useState<ConceptKey>("pulse");
  const [arcadeGiftTab, setArcadeGiftTab] = useState<"upcoming" | "past">("upcoming");
  const concept = CONCEPTS[activeConcept];
  const themeClass =
    activeConcept === "pulse"
      ? styles.themePulse
      : activeConcept === "editorial"
        ? styles.themeEditorial
        : styles.themeArcade;

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.mark}>C</span>
          <span>ChipIn</span>
        </div>
        <span className={styles.badge}>Design Lab / Experimental</span>
      </div>

      <section className={styles.switcher}>
        {(Object.keys(CONCEPTS) as ConceptKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveConcept(key)}
            className={`${styles.switchButton} ${
              activeConcept === key ? styles.switchButtonActive : ""
            }`}
          >
            {CONCEPTS[key].label}
          </button>
        ))}
      </section>

      <section className={`${styles.canvas} ${themeClass}`}>
        <div className={styles.bgOrbA} />
        <div className={styles.bgOrbB} />
        <div className={styles.bgGrid} />

        <header className={styles.hero}>
          <p className={styles.eyebrow}>{concept.eyebrow}</p>
          <h1>{concept.title}</h1>
          <p className={styles.subtitle}>{concept.subtitle}</p>
          {activeConcept === "arcade" ? (
            <div className={styles.chips} role="tablist" aria-label="Gift timeline tabs">
              <button
                type="button"
                role="tab"
                aria-selected={arcadeGiftTab === "upcoming"}
                onClick={() => setArcadeGiftTab("upcoming")}
                className={`${styles.chipButton} ${
                  arcadeGiftTab === "upcoming"
                    ? styles.chipButtonActive
                    : styles.chipButtonInactive
                }`}
              >
                Upcoming gifts
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={arcadeGiftTab === "past"}
                onClick={() => setArcadeGiftTab("past")}
                className={`${styles.chipButton} ${
                  arcadeGiftTab === "past"
                    ? styles.chipButtonActive
                    : styles.chipButtonInactive
                }`}
              >
                Past gifts
              </button>
            </div>
          ) : (
            <div className={styles.chips}>
              {concept.chips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          )}
        </header>

        {activeConcept === "pulse" ? (
          <div className={styles.previewRow}>
            <article className={styles.panel}>
              <h2>Upcoming gifts</h2>
              <div className={styles.cardList}>
                <div className={styles.giftCard}>
                  <div>
                    <strong>Sam's Birthday Camera Fund</strong>
                    <p>12 invited · 7 chipped in</p>
                  </div>
                  <span>Open</span>
                </div>
                <div className={styles.giftCard}>
                  <div>
                    <strong>Housewarming Espresso Machine</strong>
                    <p>8 invited · 3 chipped in</p>
                  </div>
                  <span>Open</span>
                </div>
              </div>
              <button type="button" className={styles.primary}>
                Create new gift
              </button>
            </article>

            <article className={styles.panel}>
              <h2>Micro interactions</h2>
              <ul className={styles.notes}>
                <li>Animated gradient background with gentle drift</li>
                <li>Glass cards + soft shadow depth</li>
                <li>High-contrast call-to-action treatment</li>
                <li>Section chips for playful hierarchy</li>
              </ul>
              <button type="button" className={styles.secondary}>
                This concept feels right
              </button>
            </article>
          </div>
        ) : null}

        {activeConcept === "editorial" ? (
          <section className={styles.editorialLayout}>
            <article className={styles.editorialLead}>
              <p>Issue 01</p>
              <h2>Gift planning should feel like an event, not a form.</h2>
              <blockquote>
                "A premium, social rhythm with less dashboard noise and more emotional
                context."
              </blockquote>
              <button type="button" className={styles.editorialCta}>
                Start a curated gift list
              </button>
            </article>

            <article className={styles.editorialRail}>
              <h3>Timeline</h3>
              <div className={styles.timelineCard}>
                <span>Fri</span>
                <div>
                  <strong>Invite circle opens</strong>
                  <p>Auto-reminders + RSVP pulse</p>
                </div>
              </div>
              <div className={styles.timelineCard}>
                <span>Sun</span>
                <div>
                  <strong>Contributions checkpoint</strong>
                  <p>Progress digest sent to organizer</p>
                </div>
              </div>
              <div className={styles.timelineCard}>
                <span>Tue</span>
                <div>
                  <strong>Checkout closes</strong>
                  <p>One tap to finalize purchase</p>
                </div>
              </div>
            </article>

            <div className={styles.editorialStats}>
              <div className={styles.statTile}>
                <span>Avg completion</span>
                <strong>91%</strong>
              </div>
              <div className={styles.statTile}>
                <span>Median time</span>
                <strong>2.4 days</strong>
              </div>
              <div className={styles.statTile}>
                <span>Most used split</span>
                <strong>8 friends</strong>
              </div>
            </div>
          </section>
        ) : null}

        {activeConcept === "arcade" ? (
          <section className={styles.arcadeTimelineLayout}>
            <div className={styles.eventColumns}>
              <article className={styles.eventColumn}>
                <div className={styles.eventColumnHeader}>
                  <h2>{arcadeGiftTab === "upcoming" ? "Upcoming gifts" : "Past gifts"}</h2>
                  <button type="button" className={styles.headerActionButton}>
                    New gift
                  </button>
                </div>
                <div className={styles.eventList}>
                  {(arcadeGiftTab === "upcoming" ? ARCADE_UPCOMING_EVENTS : ARCADE_PAST_GIFTS).map((event) => (
                    <div key={event.title} className={styles.eventCard}>
                      <span className={styles.eventDate}>{event.dateLabel}</span>
                      <div className={`${styles.eventImage} ${styles[event.imageClass]}`} />
                      <div className={styles.eventBody}>
                        <p className={styles.eventType}>{event.eventType}</p>
                        <h3>{event.title}</h3>
                        <p>{event.contributors}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.eventColumn}>
                <div className={styles.eventColumnHeader}>
                  <h2>Events</h2>
                  <button type="button" className={styles.headerActionButton}>
                    New event
                  </button>
                </div>
                <div className={styles.eventList}>
                  {ARCADE_EVENTS.map((event) => (
                    <div key={event.title} className={styles.eventCard}>
                      <span className={styles.eventDate}>{event.dateLabel}</span>
                      <div className={`${styles.eventImage} ${styles[event.imageClass]}`} />
                      <div className={styles.eventBody}>
                        <p className={styles.eventType}>{event.eventType}</p>
                        <h3>{event.title}</h3>
                        <p>{event.contributors}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
