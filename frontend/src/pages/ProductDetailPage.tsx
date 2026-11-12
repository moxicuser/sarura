import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { LoginGate } from "../components/auth/LoginGate";
import { ErrorState, LoadingState, VerifiedBadge, buttonStyles } from "../components/ui";
import { normalizeLanguage } from "../i18n";
import { apiGet } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  badgeLevel,
  formatDate,
  formatNumber,
  formatPrice,
  localizedName,
} from "../lib/format";
import { useApi } from "../lib/useApi";
import type { ProductDetail } from "../types/api";
import { NotFoundPage } from "./NotFoundPage";

export function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { status } = useAuth();
  const { id } = useParams();
  const productId = Number(id);
  const [activeImage, setActiveImage] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);

  const product = useApi<ProductDetail>(
    (signal) => apiGet<ProductDetail>(`/products/${productId}/`, {}, signal),
    [productId],
  );

  useEffect(() => {
    setActiveImage(0);
  }, [product.data?.id]);

  if (!Number.isInteger(productId) || productId <= 0) {
    return <NotFoundPage />;
  }

  if (product.loading) {
    return (
      <div className="sarura-container py-12">
        <LoadingState />
      </div>
    );
  }

  if (product.error?.status === 404) {
    return <NotFoundPage />;
  }

  if (product.error || !product.data) {
    return (
      <div className="sarura-container py-12">
        <ErrorState message={t("product.errorBody")} onRetry={product.reload} />
      </div>
    );
  }

  const data = product.data;
  const images = data.images;
  const currentImage = images[activeImage] ?? images[0];

  return (
    <section className="sarura-container py-8 lg:py-12">
      <nav aria-label={t("product.breadcrumbLabel")} className="text-sm text-sarura-gray">
        <Link to="/marketplace" className="font-semibold text-sarura-green-dark hover:underline">
          {t("nav.marketplace")}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{localizedName(data.category, language)}</span>
        <span aria-hidden="true"> / </span>
        <span>{data.crop_name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div>
          <div className="overflow-hidden rounded-xl border border-sarura-border bg-sarura-page">
            {currentImage ? (
              <img
                src={currentImage.image}
                alt={currentImage.alt_text || data.crop_name}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm font-medium text-sarura-gray">
                {t("listing.noPhoto")}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={t("product.showPhoto", { number: index + 1 })}
                  aria-pressed={index === activeImage}
                  className={`overflow-hidden rounded-lg border-2 transition-colors ${
                    index === activeImage
                      ? "border-sarura-green"
                      : "border-transparent hover:border-sarura-border"
                  }`}
                >
                  <img
                    src={image.image}
                    alt={image.alt_text || t("product.photoAlt", { number: index + 1 })}
                    className="h-16 w-20 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sarura-gray">
            {localizedName(data.category, language)}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-sarura-ink">
            {data.crop_name}
          </h1>
          <p className="mt-3 text-2xl font-bold text-sarura-green-dark">
            {t("listing.pricePerKg", {
              price: formatPrice(data.price_per_unit, language),
            })}
          </p>
          <p className="mt-1 text-sm font-medium text-sarura-gray">
            {data.price_basis === "fixed"
              ? t("listing.fixedPrice")
              : t("listing.negotiablePrice")}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-sarura-border py-5 text-sm">
            <div>
              <dt className="font-semibold text-sarura-gray">{t("product.quantityLabel")}</dt>
              <dd className="mt-0.5 text-base font-bold text-sarura-ink">
                {t("listing.quantity", {
                  quantity: formatNumber(data.quantity, language),
                })}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-sarura-gray">{t("product.locationLabel")}</dt>
              <dd className="mt-0.5 text-base font-bold text-sarura-ink">
                {data.location_label || data.district_name}
              </dd>
            </div>
            {data.available_from && (
              <div>
                <dt className="font-semibold text-sarura-gray">
                  {t("product.availableFromLabel")}
                </dt>
                <dd className="mt-0.5 text-base text-sarura-ink">
                  {formatDate(data.available_from, language)}
                </dd>
              </div>
            )}
            <div>
              <dt className="font-semibold text-sarura-gray">{t("product.postedLabel")}</dt>
              <dd className="mt-0.5 text-base text-sarura-ink">
                {formatDate(data.created_at, language)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl border border-sarura-border bg-white p-4">
            <p className="text-sm text-sarura-gray">{t("listing.soldBy")}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Link
                to={`/farmers/${data.farmer.id}`}
                className="text-lg font-bold text-sarura-ink hover:text-sarura-green-dark hover:underline"
              >
                {data.farmer.display_name}
              </Link>
              <VerifiedBadge level={badgeLevel(data.farmer.verification_level)} />
            </div>
            {data.farmer.district_name && (
              <p className="mt-1 text-sm text-sarura-gray">{data.farmer.district_name}</p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-sarura-gray">
              {t("product.contactPrivacy")}
            </p>
          </div>

          {status === "authenticated" ? (
            <div className="mt-4 rounded-xl border border-sarura-green/40 bg-sarura-green-light p-4">
              <p className="text-sm font-bold text-sarura-green-dark">
                {t("product.contactReadyTitle")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                {t("product.contactReadyBody")}
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setGateOpen(true)}
                className={buttonStyles({ size: "lg", fullWidth: true, className: "mt-4" })}
              >
                {t("product.contactFarmer")}
              </button>
              <p className="mt-2 text-center text-xs text-sarura-gray">
                {t("product.loginNote")}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section>
          <h2 className="text-xl font-bold text-sarura-ink">{t("product.aboutTitle")}</h2>
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-sarura-gray">
            {data.description || t("product.noDescription")}
          </p>
        </section>

        <section className="rounded-xl border border-sarura-border bg-white p-5">
          <h2 className="text-base font-bold text-sarura-ink">{t("product.safetyTitle")}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-sarura-gray">
            <li>{t("product.safetyOne")}</li>
            <li>{t("product.safetyTwo")}</li>
            <li>{t("product.safetyThree")}</li>
          </ul>
        </section>
      </div>

      <LoginGate
        open={gateOpen}
        next={`/products/${data.id}`}
        onClose={() => setGateOpen(false)}
      />
    </section>
  );
}
