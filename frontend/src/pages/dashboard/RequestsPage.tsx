import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { RoleNotice } from "../../components/dashboard/RoleNotice";
import { PageIntro } from "../../components/layout/PageIntro";
import { EmptyState, ErrorState, LoadingState, StatusPill } from "../../components/ui";
import { normalizeLanguage } from "../../i18n";
import { apiGet } from "../../lib/api";
import { requestStatusTone } from "../../lib/deals";
import { useAuth } from "../../lib/auth";
import { formatDate, formatNumber, formatPrice } from "../../lib/format";
import { useApi } from "../../lib/useApi";
import type { Paginated, PurchaseRequest } from "../../types/api";

function RequestCard({ item }: { item: PurchaseRequest }) {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  return (
    <li className="rounded-xl border border-sarura-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-sarura-ink">{item.product.crop_name}</h3>
            <StatusPill tone={requestStatusTone(item.status)}>
              {t(`status.${item.status}`)}
            </StatusPill>
          </div>
          <p className="mt-1 text-sm text-sarura-gray">
            {item.product.district_name} ·{" "}
            {item.viewer_side === "buying"
              ? t("dashboard.orders.partyFarmer")
              : t("dashboard.orders.partyBuyer")}
          </p>
        </div>
        <p className="text-sm font-bold text-sarura-green-dark">
          {t("listing.quantity", { quantity: formatNumber(item.current_terms.quantity, language) })}
        </p>
      </div>

      <dl className="mt-3 grid gap-2 border-t border-sarura-border pt-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-sarura-gray">{t("dashboard.requests.priceLabel")}</dt>
          <dd>{formatPrice(item.current_terms.offered_price, language)} RWF/kg</dd>
        </div>
        <div>
          <dt className="font-semibold text-sarura-gray">{t("dashboard.requests.updatedLabel")}</dt>
          <dd>{formatDate(item.updated_at, language)}</dd>
        </div>
      </dl>

      {item.message && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-sarura-gray">
          {item.message}
        </p>
      )}

      <div className="mt-4">
        <Link
          to={`/dashboard/requests/${item.id}`}
          className="text-sm font-bold text-sarura-green-dark hover:underline"
        >
          {t("dashboard.requests.viewDetails")}
        </Link>
      </div>
    </li>
  );
}

function RequestList({ items }: { items: PurchaseRequest[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <RequestCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

export function RequestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const resource = useApi<Paginated<PurchaseRequest>>(
    (signal) => apiGet<Paginated<PurchaseRequest>>("/deals/requests/", {}, signal),
    [],
  );

  if (!user) {
    return null;
  }
  if (!user.is_buyer && !user.is_farmer) {
    return <RoleNotice role="buyer" />;
  }

  const results = resource.data?.results ?? [];
  const buying = results.filter((item) => item.viewer_side === "buying");
  const selling = results.filter((item) => item.viewer_side === "selling");
  const dualRole = user.is_buyer && user.is_farmer;

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.requests.title")}
        description={t("dashboard.requests.description")}
      />

      <section className="sarura-container py-8">
        {resource.loading && <LoadingState />}
        {resource.error && (
          <ErrorState
            message={t("dashboard.requests.loadError")}
            onRetry={resource.reload}
          />
        )}
        {!resource.loading && !resource.error && results.length === 0 && (
          <EmptyState
            title={t("dashboard.requests.emptyTitle")}
            message={t("dashboard.requests.emptyBody")}
            action={{
              label: t("dashboard.requests.browse"),
              onClick: () => navigate("/marketplace"),
            }}
          />
        )}

        {!resource.loading && !resource.error && results.length > 0 && (
          <div className="space-y-8">
            {dualRole ? (
              <>
                <div>
                  <h2 className="mb-3 text-xl font-bold text-sarura-ink">
                    {t("dashboard.requests.sideBuying")}
                  </h2>
                  {buying.length === 0 ? (
                    <p className="text-sm text-sarura-gray">
                      {t("dashboard.requests.emptyBody")}
                    </p>
                  ) : (
                    <RequestList items={buying} />
                  )}
                </div>
                <div>
                  <h2 className="mb-3 text-xl font-bold text-sarura-ink">
                    {t("dashboard.requests.sideSelling")}
                  </h2>
                  {selling.length === 0 ? (
                    <p className="text-sm text-sarura-gray">
                      {t("dashboard.requests.emptyBody")}
                    </p>
                  ) : (
                    <RequestList items={selling} />
                  )}
                </div>
              </>
            ) : (
              <RequestList items={results} />
            )}
          </div>
        )}
      </section>
    </>
  );
}
