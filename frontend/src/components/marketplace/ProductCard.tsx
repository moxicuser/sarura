import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { normalizeLanguage } from "../../i18n";
import { badgeLevel, formatNumber, formatPrice, localizedName } from "../../lib/format";
import type { ProductListItem } from "../../types/api";
import { VerifiedBadge } from "../ui";

export function ProductCard({ product }: { product: ProductListItem }) {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-sarura-border bg-white shadow-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sarura-page">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.crop_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-sarura-gray">
            {t("listing.noPhoto")}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-sarura-gray">
              {localizedName(product.category, language)}
            </p>
            <h3 className="mt-1 truncate text-lg font-bold text-sarura-ink">
              {product.crop_name}
            </h3>
          </div>
          <p className="shrink-0 text-sm font-bold text-sarura-green-dark">
            {t("listing.pricePerKg", {
              price: formatPrice(product.price_per_unit, language),
            })}
          </p>
        </div>

        <p className="mt-2 text-sm text-sarura-gray">
          {t("listing.quantity", {
            quantity: formatNumber(product.quantity, language),
          })}
          {product.district_name ? ` · ${product.district_name}` : ""}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <VerifiedBadge level={badgeLevel(product.farmer.verification_level)} />
          <span className="text-xs text-sarura-gray">
            {t("listing.soldBy")} {product.farmer.display_name}
          </span>
        </div>
      </div>
    </Link>
  );
}
