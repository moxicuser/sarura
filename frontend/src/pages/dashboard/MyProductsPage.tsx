import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { FormAlert } from "../../components/auth/FormAlert";
import { RoleNotice } from "../../components/dashboard/RoleNotice";
import { PageIntro } from "../../components/layout/PageIntro";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusPill,
  buttonStyles,
} from "../../components/ui";
import { normalizeLanguage } from "../../i18n";
import { apiGet, apiPatch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatNumber, formatPrice, localizedName } from "../../lib/format";
import { useApi } from "../../lib/useApi";
import type { Paginated, ProductListItem } from "../../types/api";

function pillTone(status: ProductListItem["status"]) {
  if (status === "active") {
    return "success" as const;
  }
  if (status === "sold") {
    return "pending" as const;
  }
  return "neutral" as const;
}

function statusLabel(status: ProductListItem["status"], t: (key: string) => string) {
  return t(`status.${status}`);
}

export function MyProductsPage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const resource = useApi<Paginated<ProductListItem>>(
    (signal) => apiGet<Paginated<ProductListItem>>("/products/mine/", {}, signal),
    [],
  );

  if (!user) {
    return null;
  }
  if (!user.is_farmer) {
    return <RoleNotice role="farmer" />;
  }

  const changeStatus = async (product: ProductListItem, status: "sold" | "hidden") => {
    setBusyId(product.id);
    setActionError(null);
    try {
      await apiPatch(`/products/${product.id}/`, {
        status,
        ...(status === "sold" ? { quantity: 0 } : {}),
      });
      resource.reload();
    } catch {
      setActionError(t("dashboard.products.actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.products.title")}
        description={t("dashboard.products.description")}
      >
        <div className="mt-5">
          <Link to="/dashboard/products/new" className={buttonStyles()}>
            {t("dashboard.products.add")}
          </Link>
        </div>
      </PageIntro>

      <section className="sarura-container py-8">
        {actionError && (
          <div className="mb-5">
            <FormAlert message={actionError} />
          </div>
        )}

        {resource.loading && <LoadingState />}
        {resource.error && (
          <ErrorState message={t("dashboard.products.loadError")} onRetry={resource.reload} />
        )}
        {!resource.loading && !resource.error && resource.data?.results.length === 0 && (
          <EmptyState
            title={t("dashboard.products.emptyTitle")}
            message={t("dashboard.products.emptyBody")}
            action={{
              label: t("dashboard.products.add"),
              onClick: () => navigate("/dashboard/products/new"),
            }}
          />
        )}

        {!resource.loading && !resource.error && (resource.data?.results.length ?? 0) > 0 && (
          <ul className="space-y-4">
            {resource.data?.results.map((product) => (
              <li
                key={product.id}
                className="rounded-xl border border-sarura-border bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-sarura-ink">{product.crop_name}</h2>
                      <StatusPill tone={pillTone(product.status)}>
                        {statusLabel(product.status, t)}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-sarura-gray">
                      {localizedName(product.category, language)} · {product.district_name}
                      {product.sector_name ? `, ${product.sector_name}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-sarura-green-dark">
                    {t("listing.pricePerKg", {
                      price: formatPrice(product.price_per_unit, language),
                    })}
                  </p>
                </div>

                <p className="mt-3 text-sm text-sarura-gray">
                  {t("listing.quantity", {
                    quantity: formatNumber(product.quantity, language),
                  })}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/dashboard/products/${product.id}/edit`}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    {t("dashboard.products.edit")}
                  </Link>
                  {product.status === "active" && (
                    <>
                      <Button
                        size="sm"
                        variant="tertiary"
                        disabled={busyId === product.id}
                        onClick={() => void changeStatus(product, "sold")}
                      >
                        {t("dashboard.products.markSold")}
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        disabled={busyId === product.id}
                        onClick={() => void changeStatus(product, "hidden")}
                      >
                        {t("dashboard.products.hide")}
                      </Button>
                    </>
                  )}
                  <Link
                    to={`/products/${product.id}`}
                    className={buttonStyles({ variant: "tertiary", size: "sm" })}
                  >
                    {t("dashboard.products.view")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
