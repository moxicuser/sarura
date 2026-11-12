import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";
import { ProductGrid } from "../components/marketplace/ProductGrid";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  SelectField,
  TextField,
} from "../components/ui";
import { normalizeLanguage } from "../i18n";
import { apiGet } from "../lib/api";
import { localizedName } from "../lib/format";
import { useApi } from "../lib/useApi";
import type {
  Category,
  District,
  Paginated,
  ProductListItem,
  Province,
  Sector,
} from "../types/api";

const PAGE_SIZE = 24;

const filterKeys = [
  "search",
  "category",
  "province",
  "district",
  "sector",
  "sort",
  "verified",
  "min_price",
  "max_price",
  "min_quantity",
] as const;

type FilterKey = (typeof filterKeys)[number];

type FilterDraft = Record<FilterKey, string>;

function draftFrom(params: URLSearchParams): FilterDraft {
  return {
    search: params.get("search") ?? "",
    category: params.get("category") ?? "",
    province: params.get("province") ?? "",
    district: params.get("district") ?? "",
    sector: params.get("sector") ?? "",
    sort: params.get("sort") ?? "newest",
    verified: params.get("verified") ?? "",
    min_price: params.get("min_price") ?? "",
    max_price: params.get("max_price") ?? "",
    min_quantity: params.get("min_quantity") ?? "",
  };
}

export function MarketplacePage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const [params, setParams] = useSearchParams();
  const serialized = params.toString();
  const [draft, setDraft] = useState<FilterDraft>(() => draftFrom(params));

  useEffect(() => {
    setDraft(draftFrom(new URLSearchParams(serialized)));
  }, [serialized]);

  const categories = useApi<Category[]>(
    (signal) => apiGet<Category[]>("/categories/", {}, signal),
    [],
  );
  const provinces = useApi<Province[]>(
    (signal) => apiGet<Province[]>("/locations/provinces/", {}, signal),
    [],
  );
  const districts = useApi<District[]>(
    (signal) =>
      apiGet<District[]>(
        "/locations/districts/",
        draft.province ? { province: draft.province } : {},
        signal,
      ),
    [draft.province],
  );
  const sectors = useApi<Sector[]>(
    (signal) =>
      draft.district
        ? apiGet<Sector[]>("/locations/sectors/", { district: draft.district }, signal)
        : Promise.resolve([]),
    [draft.district],
  );

  const listParams: Record<string, string> = {};
  for (const key of [...filterKeys, "page"] as const) {
    const value = params.get(key);
    if (value) {
      listParams[key] = value;
    }
  }

  const products = useApi<Paginated<ProductListItem>>(
    (signal) => apiGet<Paginated<ProductListItem>>("/products/", listParams, signal),
    [serialized],
  );

  const page = Number(params.get("page") ?? "1") || 1;
  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.count / PAGE_SIZE)) : 1;
  const hasFilters = filterKeys.some((key) => params.get(key));

  const update = (key: FilterKey, value: string) => {
    setDraft((current) => {
      if (key === "province") {
        return { ...current, province: value, district: "", sector: "" };
      }
      if (key === "district") {
        return { ...current, district: value, sector: "" };
      }
      return { ...current, [key]: value };
    });
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const key of filterKeys) {
      const value = draft[key];
      if (!value) {
        continue;
      }
      if (key === "sort" && value === "newest") {
        continue;
      }
      next.set(key, value);
    }
    setParams(next);
  };

  const clearFilters = () => {
    setParams(new URLSearchParams());
  };

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(nextPage));
    }
    setParams(next);
  };

  const categoryOptions = (categories.data ?? []).map((category) => ({
    value: String(category.id),
    label: localizedName(category, language),
  }));
  const provinceOptions = (provinces.data ?? []).map((province) => ({
    value: String(province.id),
    label: localizedName(province, language),
  }));
  const districtOptions = (districts.data ?? []).map((district) => ({
    value: String(district.id),
    label: district.name,
  }));
  const sectorOptions = (sectors.data ?? []).map((sector) => ({
    value: String(sector.id),
    label: sector.name,
  }));

  return (
    <>
      <PageIntro
        eyebrow={t("marketplace.eyebrow")}
        title={t("marketplace.title")}
        description={t("marketplace.description")}
      />

      <section className="sarura-container py-8 lg:py-12">
        <div className="rounded-xl border border-sarura-border bg-white p-4 sm:p-6">
          <form onSubmit={applyFilters}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextField
                label={t("marketplace.searchLabel")}
                placeholder={t("home.searchPlaceholder")}
                value={draft.search}
                maxLength={60}
                wrapperClassName="flex-1"
                onChange={(event) => update("search", event.target.value)}
              />
              <Button type="submit" size="md" className="sm:mb-0.5">
                {t("common.search")}
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                label={t("marketplace.category")}
                placeholder={t("marketplace.allCategories")}
                value={draft.category}
                options={categoryOptions}
                onChange={(event) => update("category", event.target.value)}
              />
              <SelectField
                label={t("marketplace.province")}
                placeholder={t("marketplace.allProvinces")}
                value={draft.province}
                options={provinceOptions}
                onChange={(event) => update("province", event.target.value)}
              />
              <SelectField
                label={t("marketplace.district")}
                placeholder={t("marketplace.allDistricts")}
                value={draft.district}
                options={districtOptions}
                onChange={(event) => update("district", event.target.value)}
              />
              <SelectField
                label={t("marketplace.sector")}
                placeholder={t("marketplace.allSectors")}
                value={draft.sector}
                options={sectorOptions}
                onChange={(event) => update("sector", event.target.value)}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                label={t("marketplace.sort")}
                value={draft.sort}
                options={[
                  { value: "newest", label: t("marketplace.sortNewest") },
                  { value: "price", label: t("marketplace.sortPrice") },
                  { value: "nearest", label: t("marketplace.sortNearest") },
                ]}
                onChange={(event) => update("sort", event.target.value)}
              />
              <TextField
                type="number"
                min="0"
                max="100000"
                label={t("marketplace.minPrice")}
                placeholder="50"
                value={draft.min_price}
                onChange={(event) => update("min_price", event.target.value)}
              />
              <TextField
                type="number"
                min="0"
                max="100000"
                label={t("marketplace.maxPrice")}
                placeholder="100000"
                value={draft.max_price}
                onChange={(event) => update("max_price", event.target.value)}
              />
              <TextField
                type="number"
                min="0"
                max="1000000"
                label={t("marketplace.minQuantity")}
                placeholder="100"
                value={draft.min_quantity}
                onChange={(event) => update("min_quantity", event.target.value)}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-sarura-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-sarura-ink">
                <input
                  type="checkbox"
                  checked={draft.verified === "true"}
                  onChange={(event) =>
                    update("verified", event.target.checked ? "true" : "")
                  }
                  className="h-4 w-4 rounded border-sarura-border text-sarura-green focus:ring-sarura-green"
                />
                {t("marketplace.verifiedOnly")}
              </label>
              <div className="flex flex-wrap gap-2">
                {hasFilters && (
                  <Button type="button" variant="tertiary" onClick={clearFilters}>
                    {t("marketplace.clearFilters")}
                  </Button>
                )}
                <Button type="submit">{t("marketplace.applyFilters")}</Button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-sarura-ink">{t("marketplace.listingsTitle")}</h2>
          {products.data && (
            <p className="text-sm text-sarura-gray" role="status">
              {t("marketplace.resultsCount", { count: products.data.count })}
            </p>
          )}
        </div>

        {params.get("sort") === "nearest" && (
          <p className="mt-2 text-sm text-sarura-gray">{t("marketplace.nearestNote")}</p>
        )}

        <div className="mt-6">
          {products.loading && <LoadingState />}

          {products.error && products.error.status === 400 && (
            <ErrorState
              title={t("marketplace.invalidFiltersTitle")}
              message={t("marketplace.invalidFiltersBody")}
              onRetry={clearFilters}
            />
          )}
          {products.error && products.error.status !== 400 && (
            <ErrorState message={t("marketplace.errorBody")} onRetry={products.reload} />
          )}

          {products.data && products.data.results.length === 0 && (
            <EmptyState
              title={t("marketplace.emptyTitle")}
              message={t("marketplace.emptyBody")}
              action={
                hasFilters
                  ? { label: t("marketplace.clearFilters"), onClick: clearFilters }
                  : undefined
              }
            />
          )}

          {products.data && products.data.results.length > 0 && (
            <>
              <ProductGrid products={products.data.results} />
              {totalPages > 1 && (
                <nav
                  aria-label={t("marketplace.paginationLabel")}
                  className="mt-8 flex items-center justify-between gap-3 border-t border-sarura-border pt-4"
                >
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    {t("common.previous")}
                  </Button>
                  <p className="text-sm font-medium text-sarura-gray">
                    {t("marketplace.pageOf", { page, total: totalPages })}
                  </p>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    {t("common.next")}
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
