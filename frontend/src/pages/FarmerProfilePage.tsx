import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { ProductGrid } from "../components/marketplace/ProductGrid";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  VerifiedBadge,
  buttonStyles,
} from "../components/ui";
import { normalizeLanguage } from "../i18n";
import { apiGet } from "../lib/api";
import { badgeLevel, formatMonthYear } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { PublicFarmer } from "../types/api";
import { NotFoundPage } from "./NotFoundPage";

export function FarmerProfilePage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { id } = useParams();
  const farmerId = Number(id);

  const farmer = useApi<PublicFarmer>(
    (signal) => apiGet<PublicFarmer>(`/farmers/${farmerId}/`, {}, signal),
    [farmerId],
  );

  if (!Number.isInteger(farmerId) || farmerId <= 0) {
    return <NotFoundPage />;
  }

  if (farmer.loading) {
    return (
      <div className="sarura-container py-12">
        <LoadingState />
      </div>
    );
  }

  if (farmer.error?.status === 404) {
    return <NotFoundPage />;
  }

  if (farmer.error || !farmer.data) {
    return (
      <div className="sarura-container py-12">
        <ErrorState message={t("farmer.errorBody")} onRetry={farmer.reload} />
      </div>
    );
  }

  const data = farmer.data;
  const badge = badgeLevel(data.verification_level);

  return (
    <>
      <section className="border-b border-sarura-border bg-sarura-green-light">
        <div className="sarura-container py-10 sm:py-14">
          <Link
            to="/marketplace"
            className="text-sm font-semibold text-sarura-green-dark underline-offset-4 hover:underline"
          >
            {t("farmer.backToMarketplace")}
          </Link>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sarura-green-dark">
                {t("farmer.eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sarura-ink sm:text-4xl">
                {data.display_name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <VerifiedBadge level={badge} />
                {data.district_name && (
                  <span className="text-sm font-medium text-sarura-gray">
                    {data.district_name}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-sarura-border bg-white px-4 py-3 text-sm">
              <p className="font-semibold text-sarura-ink">
                {t("farmer.activeListings", { count: data.active_listings_count })}
              </p>
              <p className="mt-1 text-sarura-gray">
                {t("farmer.memberSince", {
                  date: formatMonthYear(data.member_since, language),
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sarura-container py-10 lg:py-14">
        <div className="rounded-xl border border-sarura-border bg-white p-5">
          <h2 className="text-base font-bold text-sarura-ink">
            {t("farmer.contactTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
            {t("farmer.contactBody")}
          </p>
          <Link
            to="/marketplace"
            className={buttonStyles({ variant: "secondary", className: "mt-4" })}
          >
            {t("farmer.contactAction")}
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-sarura-ink">
            {t("farmer.listingsTitle")}
          </h2>
        </div>

        <div className="mt-6">
          {data.products.length === 0 ? (
            <EmptyState title={t("farmer.emptyTitle")} message={t("farmer.emptyBody")} />
          ) : (
            <ProductGrid products={data.products} />
          )}
        </div>
      </section>
    </>
  );
}
