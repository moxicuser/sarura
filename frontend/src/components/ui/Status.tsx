import type { ReactNode } from "react";

import { useTranslation } from "react-i18next";

export type StatusTone = "neutral" | "pending" | "success" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-sarura-border bg-white text-sarura-gray",
  pending: "border-sarura-amber bg-white text-sarura-amber",
  success: "border-sarura-green bg-sarura-green-light text-sarura-green-dark",
  danger: "border-sarura-red bg-white text-sarura-red",
};

export type StatusPillProps = {
  tone?: StatusTone;
  children: ReactNode;
};

export function StatusPill({ tone = "neutral", children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export type VerificationLevel = "account" | "identity" | "cooperative";

const verificationKeys: Record<VerificationLevel, string> = {
  account: "status.accountVerified",
  identity: "status.identityReviewed",
  cooperative: "status.cooperativeVerified",
};

export type VerifiedBadgeProps = {
  level?: VerificationLevel | "unverified" | null;
  className?: string;
};

/**
 * The only check mark allowed by the design rules: it always sits next to the
 * named verification level, never on its own.
 */
export function VerifiedBadge({ level, className = "" }: VerifiedBadgeProps) {
  const { t } = useTranslation();

  if (!level || level === "unverified") {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-sarura-green-light px-2.5 py-1 text-xs font-semibold text-sarura-green-dark ${className}`}
    >
      <span aria-hidden="true">✓</span>
      <span>{t(verificationKeys[level])}</span>
    </span>
  );
}
