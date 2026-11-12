import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";
import { VerifiedBadge, buttonStyles } from "../components/ui";
import { badgeLevel } from "../lib/format";
import { useAuth } from "../lib/auth";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

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

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <section className="sarura-container grid gap-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-12">
        <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-sarura-ink">{t("dashboard.accountTitle")}</h2>
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
              <dd className="mt-1">
                <span className="rounded-full bg-sarura-green-light px-3 py-1 text-xs font-bold text-sarura-green-dark">
                  {roles}
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-sarura-gray">
                {t("dashboard.verificationLabel")}
              </dt>
              <dd className="mt-1">
                {badge ? (
                  <VerifiedBadge level={badge} />
                ) : (
                  <span className="text-base font-semibold text-sarura-amber">
                    {t("status.unverified")}
                  </span>
                )}
                {!user.email_verified_at && (
                  <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
                    {t("dashboard.verifyHint")}
                  </p>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-sarura-ink">{t("dashboard.nextTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("dashboard.nextBody")}
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-sarura-gray">
              <li>{t("dashboard.nextFarmer")}</li>
              <li>{t("dashboard.nextBuyer")}</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/marketplace" className={buttonStyles()}>
              {t("dashboard.browse")}
            </Link>
            {user.is_farmer ? (
              <Link to="/sell" className={buttonStyles({ variant: "secondary" })}>
                {t("dashboard.sell")}
              </Link>
            ) : (
              <Link to="/register?role=farmer" className={buttonStyles({ variant: "secondary" })}>
                {t("dashboard.addFarmerRole")}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
