import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  Button,
  Card,
  CardBody,
  SelectField,
  StatusPill,
  TextField,
  TextareaField,
  VerifiedBadge,
} from "../components/ui";

const steps = [
  { titleKey: "home.browseTitle", bodyKey: "home.browseBody" },
  { titleKey: "home.negotiateTitle", bodyKey: "home.negotiateBody" },
  { titleKey: "home.agreeTitle", bodyKey: "home.agreeBody" },
] as const;

const statuses = [
  { key: "status.active", tone: "success" },
  { key: "status.sold", tone: "neutral" },
  { key: "status.pending", tone: "pending" },
  { key: "status.confirmed", tone: "success" },
  { key: "status.completed", tone: "success" },
  { key: "status.cancelled", tone: "danger" },
] as const;

export function FoundationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [savedPreview, setSavedPreview] = useState(false);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/marketplace?search=${encodeURIComponent(query)}` : "/marketplace");
  };

  const onPreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim()) {
      setNameError(t("foundation.requiredError"));
      setSavedPreview(false);
      return;
    }
    setNameError(undefined);
    setSavedPreview(true);
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
            <label htmlFor="hero-search" className="sr-only">
              {t("home.searchLabel")}
            </label>
            <input
              id="hero-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("home.searchPlaceholder")}
              className="min-h-12 flex-1 rounded-lg border border-sarura-border bg-white px-4 text-base text-sarura-ink placeholder:text-sarura-gray/70 focus:border-sarura-green focus:outline-none focus:ring-2 focus:ring-sarura-green/20"
            />
            <Button type="submit" size="lg">
              {t("common.search")}
            </Button>
          </form>
        </div>
      </section>

      <section className="sarura-container py-12 lg:py-16">
        <h2 className="text-2xl font-bold tracking-tight text-sarura-ink">
          {t("home.howItWorks")}
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.titleKey}>
              <Card padded className="h-full">
                <p className="text-xs font-bold tracking-[0.16em] text-sarura-green">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg font-bold text-sarura-ink">{t(step.titleKey)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-sarura-gray">{t(step.bodyKey)}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="foundations-heading"
        className="border-t border-sarura-border bg-white"
      >
        <div className="sarura-container py-12 lg:py-16">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2
                id="foundations-heading"
                className="text-2xl font-bold tracking-tight text-sarura-ink"
              >
                {t("home.foundationTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
                {t("home.foundationIntro")}
              </p>
            </div>
            <p className="max-w-sm rounded-lg border border-sarura-border bg-sarura-page px-4 py-3 text-xs leading-relaxed text-sarura-gray">
              {t("home.previewNote")}
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card padded>
              <h3 className="text-base font-bold text-sarura-ink">
                {t("foundation.buttonsTitle")}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                {t("foundation.buttonsBody")}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button>{t("foundation.primary")}</Button>
                <Button variant="secondary">{t("foundation.secondary")}</Button>
                <Button variant="tertiary">{t("foundation.tertiary")}</Button>
                <Button variant="danger">{t("foundation.danger")}</Button>
                <Button disabled>{t("foundation.disabled")}</Button>
              </div>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-base font-bold text-sarura-ink">
                  {t("foundation.cardsTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                  {t("foundation.cardsBody")}
                </p>
                <div className="mt-5 overflow-hidden rounded-xl border border-sarura-border">
                  <div className="flex h-32 items-center justify-center bg-sarura-page text-sm font-medium text-sarura-gray">
                    {t("listing.noPhoto")}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-sarura-ink">
                          {t("listing.sampleCrop")}
                        </h4>
                        <p className="mt-1 text-sm text-sarura-gray">
                          {t("listing.quantity", { quantity: t("listing.sampleQuantity") })} ·{" "}
                          {t("listing.sampleDistrict")}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-bold text-sarura-green-dark">
                        {t("listing.pricePerKg", { price: t("listing.samplePrice") })}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <VerifiedBadge level="account" />
                      <span className="text-xs text-sarura-gray">
                        {t("listing.soldBy")} {t("listing.sampleFarmer")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card padded>
              <h3 className="text-base font-bold text-sarura-ink">
                {t("foundation.statusTitle")}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                {t("foundation.statusBody")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <StatusPill key={status.key} tone={status.tone}>
                    {t(status.key)}
                  </StatusPill>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-sarura-border pt-5">
                <VerifiedBadge level="account" />
                <VerifiedBadge level="identity" />
                <VerifiedBadge level="cooperative" />
              </div>
            </Card>

            <Card padded>
              <form onSubmit={onPreviewSubmit} noValidate>
                <h3 className="text-base font-bold text-sarura-ink">
                  {t("foundation.formsTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                  {t("foundation.formsBody")}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <TextField
                    label={t("foundation.fullName")}
                    placeholder={t("foundation.fullNamePlaceholder")}
                    value={fullName}
                    error={nameError}
                    required
                    onChange={(event) => {
                      setFullName(event.target.value);
                      if (nameError) {
                        setNameError(undefined);
                      }
                      if (savedPreview) {
                        setSavedPreview(false);
                      }
                    }}
                  />
                  <TextField
                    type="email"
                    label={t("foundation.email")}
                    placeholder={t("foundation.emailPlaceholder")}
                  />
                  <TextField
                    type="tel"
                    label={t("foundation.phone")}
                    placeholder={t("foundation.phonePlaceholder")}
                  />
                  <SelectField
                    label={t("foundation.district")}
                    placeholder={t("foundation.districtPlaceholder")}
                    options={[
                      { value: "gasabo", label: t("foundation.districtGasabo") },
                      { value: "kicukiro", label: t("foundation.districtKicukiro") },
                      { value: "musanze", label: t("foundation.districtMusanze") },
                    ]}
                  />
                  <TextField
                    type="number"
                    min="1"
                    label={t("foundation.quantity")}
                    placeholder={t("foundation.quantityPlaceholder")}
                  />
                  <TextField
                    type="number"
                    min="50"
                    label={t("foundation.price")}
                    placeholder={t("foundation.pricePlaceholder")}
                  />
                  <TextareaField
                    label={t("foundation.description")}
                    placeholder={t("foundation.descriptionPlaceholder")}
                    hint={t("foundation.descriptionHint")}
                    wrapperClassName="sm:col-span-2"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button type="submit">{t("foundation.saveListing")}</Button>
                  <p className="text-sm text-sarura-gray">{t("foundation.previewNote")}</p>
                </div>
                {savedPreview && (
                  <p role="status" className="mt-3 text-sm font-semibold text-sarura-green-dark">
                    {t("foundation.savedPreview")}
                  </p>
                )}
              </form>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
