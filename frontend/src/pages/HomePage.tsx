import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { ProductGrid } from "../components/marketplace/ProductGrid";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  buttonStyles,
} from "../components/ui";
import { normalizeLanguage } from "../i18n";
import { apiGet } from "../lib/api";
import { localizedName } from "../lib/format";
import { useApi } from "../lib/useApi";
import type { Category, Paginated, ProductListItem } from "../types/api";

const steps = [
  { titleKey: "home.browseTitle", bodyKey: "home.browseBody" },
  { titleKey: "home.negotiateTitle", bodyKey: "home.negotiateBody" },
  { titleKey: "home.agreeTitle", bodyKey: "home.agreeBody" },
] as const;

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const [search, setSearch] = useState("");

  const categories = useApi<Category[]>(
    (signal) => apiGet<Category[]>("/categories/", {}, signal),
    [],
  );
  const latest = useApi<Paginated<ProductListItem>>(
    (signal) => apiGet<Paginated<ProductListItem>>("/products/", { sort: "newest" }, signal),
    [],
  );

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/marketplace?search=${encodeURIComponent(query)}` : "/marketplace");
  };

  return (
    <>
      <section className="border-b border-sarura-border bg-sarura-green-light">
        <div className="sarura-container py-12 sm:py-16 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sarura-green-dark">
            {t("home.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-sarura-ink sm:text-4xl lg:text-5xl">
            {t("home.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-sarura-gray sm:text-lg">
            {t("home.subtitle")}
          </p>

          <form onSubmit={onSearch} className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
            <label htmlFor="home-search" className="sr-only">
              {t("home.searchLabel")}
            </label>
            <input
              id="home-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("home.searchPlaceholder")}
              maxLength={60}
              className="min-h-12 flex-1 rounded-lg border border-sarura-border bg-white px-4 text-base text-sarura-ink placeholder:text-sarura-gray/70 focus:border-sarura-green focus:outline-none focus:ring-2 focus:ring-sarura-green/20"
            />
            <Button type="submit" size="lg">
              {t("common.search")}
            </Button>
          </form>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-sarura-ink">{t("home.popularCategories")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.loading && (
                <span className="text-sm text-sarura-gray">{t("common.loading")}</span>
              )}
              {categories.data?.map((category) => (
                <Link
                  key={category.id}
                  to={`/marketplace?category=${category.id}`}
                  className="rounded-full border border-sarura-border bg-white px-3.5 py-1.5 text-sm font-semibold text-sarura-ink transition-colors hover:border-sarura-green hover:text-sarura-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green"
                >
                  {localizedName(category, language)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sarura-container py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-sarura-ink">
              {t("home.latestTitle")}
            </h2>
            <p className="mt-1 text-sm text-sarura-gray">{t("home.latestSubtitle")}</p>
          </div>
          <Link
            to="/marketplace"
            className="text-sm font-semibold text-sarura-green-dark underline-offset-4 hover:underline"
          >
            {t("home.seeAll")}
          </Link>
        </div>

        <div className="mt-6">
          {latest.loading && <LoadingState />}
          {latest.error && (
            <ErrorState message={t("home.latestError")} onRetry={latest.reload} />
          )}
          {latest.data && latest.data.results.length === 0 && (
            <EmptyState title={t("marketplace.emptyTitle")} message={t("marketplace.emptyBody")} />
          )}
          {latest.data && latest.data.results.length > 0 && (
            <ProductGrid products={latest.data.results.slice(0, 6)} />
          )}
        </div>
      </section>

      <section className="border-y border-sarura-border bg-white">
        <div className="sarura-container py-12 lg:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-sarura-ink">
            {t("home.howItWorks")}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.titleKey}>
                <div className="h-full rounded-xl border border-sarura-border bg-sarura-page p-5">
                  <p className="text-xs font-bold tracking-[0.16em] text-sarura-green">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-sarura-ink">{t(step.titleKey)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                    {t(step.bodyKey)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            to="/how-it-works"
            className="mt-6 inline-block text-sm font-semibold text-sarura-green-dark underline-offset-4 hover:underline"
          >
            {t("home.learnMore")}
          </Link>
        </div>
      </section>

      <section className="sarura-container py-12 lg:py-16">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-sarura-green bg-sarura-green-light p-6 sm:p-8">
            <h2 className="text-xl font-bold text-sarura-ink">{t("home.farmerCtaTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("home.farmerCtaBody")}
            </p>
            <Link to="/sell" className={buttonStyles({ className: "mt-5" })}>
              {t("home.farmerCtaAction")}
            </Link>
          </div>
          <div className="rounded-xl border border-sarura-border bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-sarura-ink">{t("home.buyerCtaTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("home.buyerCtaBody")}
            </p>
            <Link
              to="/marketplace"
              className={buttonStyles({ variant: "secondary", className: "mt-5" })}
            >
              {t("home.buyerCtaAction")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
