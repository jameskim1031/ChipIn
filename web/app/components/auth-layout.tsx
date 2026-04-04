"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Gift, Sparkles } from "lucide-react";

type AuthLayoutProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  cardClassName?: string;
  showBackLink?: boolean;
  footer?: ReactNode;
};

export function AuthLayout({
  children,
  backHref = "/",
  backLabel = "Back to home",
  cardClassName = "",
  showBackLink = true,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="figmaAuthShell">
      <div className="figmaOnboardingWrap">
        <div className="figmaOnboardingHeader">
          <div className="figmaOnboardingLogo">
            <Gift size={38} />
          </div>
          <h1>ChipIn</h1>
          <p>
            <Sparkles size={16} />
            Make group gifting magical
            <Sparkles size={16} />
          </p>
        </div>

        <div className={`figmaAuthCard figmaSignupCard ${cardClassName}`.trim()}>
          {showBackLink ? (
            <Link href={backHref} className="figmaBackLink">
              ← {backLabel}
            </Link>
          ) : null}

          {children}
        </div>

        {footer}
      </div>
    </main>
  );
}
