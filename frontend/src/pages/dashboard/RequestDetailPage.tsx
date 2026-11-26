import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { FormAlert } from "../../components/auth/FormAlert";
import { RoleNotice } from "../../components/dashboard/RoleNotice";
import { PageIntro } from "../../components/layout/PageIntro";
import {
  Button,
  ErrorState,
  LoadingState,
  StatusPill,
  TextareaField,
  TextField,
} from "../../components/ui";
import { normalizeLanguage } from "../../i18n";
import { apiGet, apiPost } from "../../lib/api";
import { offerStatusTone, requestStatusTone } from "../../lib/deals";
import { useAuth } from "../../lib/auth";
import { formatDate, formatNumber, formatPrice } from "../../lib/format";
import { useApi } from "../../lib/useApi";
import type {
  CounterOffer,
  Order,
  PurchaseRequest,
} from "../../types/api";
import { NotFoundPage } from "../NotFoundPage";

type BusyAction = "accept" | "counter" | "reject" | "cancel" | null;

export function RequestDetailPage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { id } = useParams();
  const requestId = Number(id);
  const { user } = useAuth();

  const resource = useApi<PurchaseRequest>(
    (signal) => apiGet<PurchaseRequest>(`/deals/requests/${requestId}/`, {}, signal),
    [requestId],
  );

  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!resource.data) {
      return;
    }
    setQuantity(String(resource.data.current_terms.quantity));
    setPrice(resource.data.current_terms.offered_price);
    setMessage("");
    setExpiresAt("");
    setReason("");
  }, [resource.data?.id, resource.data?.current_terms.offer_id]);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return <NotFoundPage />;
  }
  if (!user) {
    return null;
  }
  if (!user.is_buyer && !user.is_farmer) {
    return <RoleNotice role="buyer" />;
  }
  if (resource.error?.status === 403 || resource.error?.status === 404) {
    return <NotFoundPage />;
  }
  if (resource.loading) {
    return (
      <div className="sarura-container py-12">
        <LoadingState />
      </div>
    );
  }
  if (resource.error || !resource.data) {
    return (
      <div className="sarura-container py-12">
        <ErrorState message={t("dashboard.requests.loadError")} onRetry={resource.reload} />
      </div>
    );
  }

  const item = resource.data;
  const isClosed = !["pending", "negotiating"].includes(item.status);

  const accept = async () => {
    setBusy("accept");
    setError(null);
    try {
      const order = await apiPost<Order>(`/deals/requests/${item.id}/accept/`, {});
      setCreatedOrderId(order.id);
      resource.reload();
    } catch {
      setError(t("dashboard.requests.actionFailed"));
    } finally {
      setBusy(null);
    }
  };

  const counter = async () => {
    setBusy("counter");
    setError(null);
    try {
      await apiPost<CounterOffer>(`/deals/requests/${item.id}/counter/`, {
        quantity: Number(quantity),
        offered_price: price,
        message,
        ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : {}),
      });
      resource.reload();
    } catch {
      setError(t("dashboard.requests.actionFailed"));
    } finally {
      setBusy(null);
    }
  };

  const close = async (action: "reject" | "cancel") => {
    setBusy(action);
    setError(null);
    try {
      await apiPost<PurchaseRequest>(`/deals/requests/${item.id}/${action}/`, {
        message: reason,
      });
      resource.reload();
    } catch {
      setError(t("dashboard.requests.actionFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.requests.detailTitle")}
        description={item.product.crop_name}
      >
        <Link
          to="/dashboard/requests"
          className="mt-4 inline-block text-sm font-bold text-sarura-green-dark hover:underline"
        >
          {t("dashboard.requests.backToRequests")}
        </Link>
      </PageIntro>

      <section className="sarura-container py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <div className="rounded-xl border border-sarura-border bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-sarura-ink">
                  {item.product.crop_name}
                </h2>
                <StatusPill tone={requestStatusTone(item.status)}>
                  {t(`status.${item.status}`)}
                </StatusPill>
              </div>
              <p className="mt-1 text-sm text-sarura-gray">
                {item.product.district_name} · {t("dashboard.requests.sentLabel")}{" "}
                {formatDate(item.created_at, language)}
              </p>
              <dl className="mt-4 grid gap-3 border-t border-sarura-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-sarura-gray">
                    {t("dashboard.requests.openingTerms")}
                  </dt>
                  <dd>
                    {t("listing.quantity", {
                      quantity: formatNumber(item.quantity, language),
                    })}
                    {" · "}
                    {formatPrice(item.offered_price, language)} RWF/kg
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-sarura-gray">
                    {t("dashboard.requests.currentTerms")}
                  </dt>
                  <dd>
                    {t("listing.quantity", {
                      quantity: formatNumber(item.current_terms.quantity, language),
                    })}
                    {" · "}
                    {formatPrice(item.current_terms.offered_price, language)} RWF/kg
                  </dd>
                </div>
              </dl>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-sarura-gray">
                {item.message || t("dashboard.requests.noMessage")}
              </p>
              {item.status_note && (
                <p className="mt-2 text-sm font-medium text-sarura-ink">
                  {item.status_note}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-sarura-border bg-white p-5">
              <h2 className="text-lg font-bold text-sarura-ink">
                {t("dashboard.requests.historyTitle")}
              </h2>
              {item.offers.length === 0 ? (
                <p className="mt-2 text-sm text-sarura-gray">
                  {t("dashboard.requests.noOffers")}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {item.offers.map((offer) => (
                    <OfferRow key={offer.id} offer={offer} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {createdOrderId !== null && (
              <div className="rounded-xl border border-sarura-green/40 bg-sarura-green-light p-4">
                <StatusPill tone="success">
                  {t("dashboard.requests.orderCreated")}
                </StatusPill>
                <Link
                  to="/dashboard/orders"
                  className="mt-3 inline-block text-sm font-bold text-sarura-green-dark hover:underline"
                >
                  {t("dashboard.requests.viewOrder")}
                </Link>
              </div>
            )}

            {item.order_id !== null && createdOrderId === null && (
              <div className="rounded-xl border border-sarura-border bg-white p-4">
                <p className="text-sm font-semibold text-sarura-ink">
                  {t("dashboard.requests.orderCreated")}
                </p>
                <Link
                  to="/dashboard/orders"
                  className="mt-2 inline-block text-sm font-bold text-sarura-green-dark hover:underline"
                >
                  {t("dashboard.requests.viewOrder")}
                </Link>
              </div>
            )}

            {isClosed ? (
              <div className="rounded-xl border border-sarura-border bg-sarura-page p-4">
                <p className="text-sm leading-relaxed text-sarura-gray">
                  {t("dashboard.requests.closedNote")}
                </p>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-sarura-border bg-white p-5">
                {error && <FormAlert message={error} />}

                {item.can_accept && (
                  <Button fullWidth disabled={busy !== null} onClick={() => void accept()}>
                    {busy === "accept"
                      ? t("dashboard.requests.working")
                      : t("dashboard.requests.accept")}
                  </Button>
                )}

                {item.can_counter && (
                  <form
                    className="space-y-3 border-t border-sarura-border pt-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void counter();
                    }}
                  >
                    <h2 className="text-base font-bold text-sarura-ink">
                      {t("dashboard.requests.counterTitle")}
                    </h2>
                    <p className="text-xs leading-relaxed text-sarura-gray">
                      {t("dashboard.requests.counterHint")}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField
                        label={t("dashboard.requests.counterQuantity")}
                        type="number"
                        min={1}
                        max={item.product.quantity}
                        step={1}
                        required
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                      />
                      <TextField
                        label={t("dashboard.requests.counterPrice")}
                        type="number"
                        min={50}
                        max={100000}
                        step="0.01"
                        required
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                      />
                    </div>
                    <TextareaField
                      label={t("dashboard.requests.counterMessage")}
                      maxLength={1000}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                    <TextField
                      label={t("dashboard.requests.counterExpiry")}
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                    />
                    <Button type="submit" fullWidth disabled={busy !== null}>
                      {busy === "counter"
                        ? t("dashboard.requests.counterWorking")
                        : t("dashboard.requests.counterSubmit")}
                    </Button>
                  </form>
                )}

                {(item.can_reject || item.can_cancel) && (
                  <div className="space-y-3 border-t border-sarura-border pt-4">
                    <TextareaField
                      label={t("dashboard.requests.reasonLabel")}
                      placeholder={t("dashboard.requests.reasonPlaceholder")}
                      maxLength={500}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {item.can_reject && (
                        <Button
                          variant="danger"
                          disabled={busy !== null}
                          onClick={() => void close("reject")}
                        >
                          {busy === "reject"
                            ? t("dashboard.requests.working")
                            : t("dashboard.requests.reject")}
                        </Button>
                      )}
                      {item.can_cancel && (
                        <Button
                          variant="secondary"
                          disabled={busy !== null}
                          onClick={() => void close("cancel")}
                        >
                          {busy === "cancel"
                            ? t("dashboard.requests.working")
                            : t("dashboard.requests.cancel")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function OfferRow({ offer }: { offer: CounterOffer }) {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  return (
    <li className="rounded-lg border border-sarura-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-sarura-ink">
          {t("listing.quantity", { quantity: formatNumber(offer.quantity, language) })}
          {" · "}
          {formatPrice(offer.offered_price, language)} RWF/kg
        </p>
        <StatusPill tone={offerStatusTone(offer.status)}>
          {t(`status.${offer.status}`)}
        </StatusPill>
      </div>
      <p className="mt-1 text-xs text-sarura-gray">
        {t("dashboard.requests.proposedBy")}: {offer.created_by.display_name} ·{" "}
        {formatDate(offer.created_at, language)}
      </p>
      {offer.expires_at && (
        <p className="mt-1 text-xs text-sarura-gray">
          {t("dashboard.requests.expiresLabel")}: {formatDate(offer.expires_at, language)}
        </p>
      )}
      {offer.message && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-sarura-gray">
          {offer.message}
        </p>
      )}
    </li>
  );
}
