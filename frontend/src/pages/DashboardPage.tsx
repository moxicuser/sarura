import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { FormAlert } from "../components/auth/FormAlert";
import { PageIntro } from "../components/layout/PageIntro";
import { Button, StatusPill, VerifiedBadge, buttonStyles } from "../components/ui";
import { normalizeLanguage } from "../i18n";
import { apiPost } from "../lib/api";
import { useAuth } from "../lib/auth";
import { badgeLevel, formatDate } from "../lib/format";

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { user } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const roles =
    user.is_farmer && user.is_buyer
      ? t("dashboard.roleBoth")
      : user.is_farmer
        ? t("dashboard.roleFarmer")
        : t("dashboard.roleBuyer");

  const badge = badgeLevel(user.verification_level);
  const verificationRows = [
    {
      label: t("dashboard.emailVerification"),
      value: user.email_verified_at,
      doneKey: "status.accountVerified",
      undoneKey: "dashboard.emailNotConfirmed",
    },
    {
      label: t("dashboard.identityReview"),
      value: user.identity_reviewed_at,
      doneKey: "status.identityReviewed",
      undoneKey: "dashboard.identityNotReviewed",
    },
    {
      label: t("dashboard.cooperativeVerification"),
      value: user.cooperative_verified_at,
      doneKey: "status.cooperativeVerified",
      undoneKey: "dashboard.cooperativeNotVerified",
    },
  ];

  const resendVerification = async () => {
    setError(null);
    setNotice(null);
    try {
      await apiPost("/auth/verify-email/resend/", {});
      setNotice(t("dashboard.resendSent"));
    } catch {
      setError(t("dashboard.resendFailed"));
    }
  };

  const shortcuts = [
    ...(user.is_farmer
      ? [
          { to: "/dashboard/products/new", label: t("dashboard.shortcuts.addProduct") },
          { to: "/dashboard/products", label: t("dashboard.shortcuts.myProducts") },
        ]
      : []),
    ...(user.is_buyer
      ? [{ to: "/dashboard/saved", label: t("dashboard.shortcuts.savedProducts") }]
      : []),
    { to: "/dashboard/requests", label: t("dashboard.shortcuts.requests") },
    { to: "/dashboard/profile", label: t("dashboard.shortcuts.profile") },
  ];

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <section className="sarura-container grid gap-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-sarura-ink">
              {t("dashboard.accountTitle")}
            </h2>
            {error && (
              <div className="mt-3">
                <FormAlert message={error} />
              </div>
            )}
            {notice && (
              <p role="status" className="mt-3 rounded-lg bg-sarura-green-light px-3 py-2 text-sm font-semibold text-sarura-green-dark">
                {notice}
              </p>
            )}
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-sarura-gray">{t("dashboard.nameLabel")}</dt>
                <dd className="text-base font-semibold text-sarura-ink">{user.full_name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-sarura-gray">{t("dashboard.emailLabel")}</dt>
                <dd className="text-base text-sarura-ink">{user.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-sarura-gray">{t("dashboard.phoneLabel")}</dt>
                <dd className="text-base text-sarura-ink">{user.phone}</dd>
              </div>
              <div>
                <dt className="font-semibold text-sarura-gray">{t("dashboard.locationLabel")}</dt>
                <dd className="text-base text-sarura-ink">
                  {user.location_label || t("dashboard.locationMissing")}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-sarura-gray">{t("dashboard.rolesLabel")}</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sarura-green-light px-3 py-1 text-xs font-bold text-sarura-green-dark">
                    {roles}
                  </span>
                  {badge && <VerifiedBadge level={badge} />}
                </dd>
              </div>
            </dl>
            {!user.email_verified_at && (
              <div className="mt-4 rounded-lg border border-sarura-amber/50 bg-white p-3">
                <p className="text-sm text-sarura-gray">{t("dashboard.verifyHint")}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => void resendVerification()}
                >
                  {t("dashboard.resendVerification")}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-sarura-ink">
              {t("dashboard.verificationLabel")}
            </h2>
            <p className="mt-1 text-sm text-sarura-gray">
              {t("dashboard.verificationIntro")}
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {verificationRows.map((row) => (
                <li key={row.label} className="rounded-lg border border-sarura-border p-3">
                  <p className="font-semibold text-sarura-gray">{row.label}</p>
                  <div className="mt-1">
                    <StatusPill tone={row.value ? "success" : "pending"}>
                      {t(row.value ? row.doneKey : row.undoneKey)}
                    </StatusPill>
                  </div>
                  {row.value && (
                    <p className="mt-1 text-xs text-sarura-gray">
                      {t("dashboard.verifiedOn", {
                        date: formatDate(row.value, language),
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-sarura-ink">
              {t("dashboard.shortcuts.title")}
            </h2>
            <p className="mt-1 text-sm text-sarura-gray">
              {t("dashboard.shortcuts.body")}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {shortcuts.map((shortcut) => (
                <li key={shortcut.to}>
                  <Link
                    to={shortcut.to}
                    className="block rounded-lg border border-sarura-border px-3 py-2 text-sm font-semibold text-sarura-green-dark hover:border-sarura-green hover:bg-sarura-green-light"
                  >
                    {shortcut.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/marketplace" className={buttonStyles()}>
              {t("dashboard.browse")}
            </Link>
            {user.is_farmer ? (
              <Link to="/dashboard/products/new" className={buttonStyles({ variant: "secondary" })}>
                {t("dashboard.addProduct")}
              </Link>
            ) : (
              <Link
                to="/dashboard/profile"
                className={buttonStyles({ variant: "secondary" })}
              >
                {t("dashboard.addFarmerRole")}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
