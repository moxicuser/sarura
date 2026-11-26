import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { FormAlert } from "../../components/auth/FormAlert";
import { RoleNotice } from "../../components/dashboard/RoleNotice";
import { PageIntro } from "../../components/layout/PageIntro";
import { ProductCard } from "../../components/marketplace/ProductCard";
import { Button, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { normalizeLanguage } from "../../i18n";
import { apiDelete, apiGet } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { useApi } from "../../lib/useApi";
import type { Paginated, SavedProduct } from "../../types/api";

export function SavedProductsPage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resource = useApi<Paginated<SavedProduct>>(
    (signal) => apiGet<Paginated<SavedProduct>>("/buyer/saved-products/", {}, signal),
    [],
  );

  if (!user) {
    return null;
  }
  if (!user.is_buyer) {
    return <RoleNotice role="buyer" />;
  }

  const remove = async (savedId: number) => {
    setRemoving(savedId);
    setError(null);
    try {
      await apiDelete(`/buyer/saved-products/${savedId}/`);
      resource.reload();
    } catch {
      setError(t("dashboard.saved.removeFailed"));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.saved.title")}
        description={t("dashboard.saved.description")}
      />

      <section className="sarura-container py-8">
        {error && (
          <div className="mb-5">
            <FormAlert message={error} />
          </div>
        )}

        {resource.loading && <LoadingState />}
        {resource.error && (
          <ErrorState message={t("dashboard.saved.loadError")} onRetry={resource.reload} />
        )}
        {!resource.loading && !resource.error && resource.data?.results.length === 0 && (
          <EmptyState
            title={t("dashboard.saved.emptyTitle")}
            message={t("dashboard.saved.emptyBody")}
            action={{
              label: t("dashboard.saved.browse"),
              onClick: () => navigate("/marketplace"),
            }}
          />
        )}

        {!resource.loading && !resource.error && (resource.data?.results.length ?? 0) > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resource.data?.results.map((item) => (
              <li key={item.id} className="flex flex-col">
                <ProductCard product={item.product} />
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-sarura-border bg-white px-3 py-2">
                  <p className="text-xs text-sarura-gray">
                    {t("dashboard.saved.savedOn", {
                      date: formatDate(item.created_at, language),
                    })}
                  </p>
                  <Button
                    size="sm"
                    variant="tertiary"
                    disabled={removing === item.id}
                    onClick={() => void remove(item.id)}
                  >
                    {t("dashboard.saved.remove")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
