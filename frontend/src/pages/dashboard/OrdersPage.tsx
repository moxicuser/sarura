import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { RoleNotice } from "../../components/dashboard/RoleNotice";
import { PageIntro } from "../../components/layout/PageIntro";
import { EmptyState, ErrorState, LoadingState, StatusPill } from "../../components/ui";
import { normalizeLanguage } from "../../i18n";
import { apiGet } from "../../lib/api";
import { orderStatusTone } from "../../lib/deals";
import { useAuth } from "../../lib/auth";
import { formatDate, formatNumber, formatPrice } from "../../lib/format";
import { useApi } from "../../lib/useApi";
import type { Order, Paginated } from "../../types/api";

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const navigate = useNavigate();
  const { user } = useAuth();

  const resource = useApi<Paginated<Order>>(
    (signal) => apiGet<Paginated<Order>>("/deals/orders/", {}, signal),
    [],
  );

  if (!user) {
    return null;
  }
  if (!user.is_buyer && !user.is_farmer) {
    return <RoleNotice role="buyer" />;
  }

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.orders.title")}
        description={t("dashboard.orders.description")}
      />

      <section className="sarura-container py-8">
        <p className="mb-6 rounded-xl border border-sarura-border bg-sarura-green-light p-4 text-sm leading-relaxed text-sarura-gray">
          {t("dashboard.orders.noPayment")}
        </p>

        {resource.loading && <LoadingState />}
        {resource.error && (
          <ErrorState message={t("dashboard.orders.loadError")} onRetry={resource.reload} />
        )}
        {!resource.loading && !resource.error && resource.data?.results.length === 0 && (
          <EmptyState
            title={t("dashboard.orders.emptyTitle")}
            message={t("dashboard.orders.emptyBody")}
            action={{
              label: t("dashboard.requests.browse"),
              onClick: () => navigate("/marketplace"),
            }}
          />
        )}

        {!resource.loading && !resource.error && (resource.data?.results.length ?? 0) > 0 && (
          <ul className="space-y-4">
            {resource.data?.results.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-sarura-border bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-sarura-ink">
                        {order.product.crop_name}
                      </h2>
                      <StatusPill tone={orderStatusTone(order.status)}>
                        {t(`status.${order.status}`)}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-sarura-gray">
                      {t("dashboard.orders.createdLabel")}{" "}
                      {formatDate(order.created_at, language)}
                    </p>
                  </div>
                  <p className="text-base font-bold text-sarura-green-dark">
                    {formatPrice(order.total_price, language)} RWF
                  </p>
                </div>

                <dl className="mt-4 grid gap-3 border-t border-sarura-border pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-sarura-gray">
                      {t("dashboard.orders.quantityLabel")}
                    </dt>
                    <dd>
                      {t("listing.quantity", {
                        quantity: formatNumber(order.quantity, language),
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-sarura-gray">
                      {t("dashboard.orders.unitPriceLabel")}
                    </dt>
                    <dd>{formatPrice(order.unit_price, language)} RWF/kg</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-sarura-gray">
                      {t("dashboard.orders.totalLabel")}
                    </dt>
                    <dd>{formatPrice(order.total_price, language)} RWF</dd>
                  </div>
                </dl>

                <p className="mt-3 text-sm text-sarura-gray">
                  {t("dashboard.orders.partyBuyer")}: {order.buyer.display_name} ·{" "}
                  {t("dashboard.orders.partyFarmer")}: {order.farmer.display_name}
                </p>

                <div className="mt-4 border-t border-sarura-border pt-3">
                  <h3 className="text-sm font-bold text-sarura-ink">
                    {t("dashboard.orders.historyTitle")}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-sarura-gray">
                    {order.events.map((event) => (
                      <li key={event.id}>
                        {t(`status.${event.to_status}`)} ·{" "}
                        {formatDate(event.created_at, language)}
                        {event.actor ? ` · ${event.actor.display_name}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={`/dashboard/requests/${order.purchase_request_id}`}
                  className="mt-4 inline-block text-sm font-bold text-sarura-green-dark hover:underline"
                >
                  {t("dashboard.orders.viewRequest")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
