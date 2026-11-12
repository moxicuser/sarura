import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";
import { buttonStyles } from "../components/ui";

const farmerSteps = [
  { titleKey: "howItWorks.farmerStep1Title", bodyKey: "howItWorks.farmerStep1Body" },
  { titleKey: "howItWorks.farmerStep2Title", bodyKey: "howItWorks.farmerStep2Body" },
  { titleKey: "howItWorks.farmerStep3Title", bodyKey: "howItWorks.farmerStep3Body" },
] as const;

const buyerSteps = [
  { titleKey: "howItWorks.buyerStep1Title", bodyKey: "howItWorks.buyerStep1Body" },
  { titleKey: "howItWorks.buyerStep2Title", bodyKey: "howItWorks.buyerStep2Body" },
  { titleKey: "howItWorks.buyerStep3Title", bodyKey: "howItWorks.buyerStep3Body" },
] as const;

function StepList({
  title,
  description,
  steps,
}: {
  title: string;
  description: string;
  steps: ReadonlyArray<{ titleKey: string; bodyKey: string }>;
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl border border-sarura-border bg-white p-6">
      <h2 className="text-2xl font-bold tracking-tight text-sarura-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-sarura-gray">{description}</p>
      <ol className="mt-6 space-y-4">
        {steps.map((step, index) => (
          <li key={step.titleKey} className="flex gap-4">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sarura-green-light text-sm font-bold text-sarura-green-dark"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="text-base font-bold text-sarura-ink">{t(step.titleKey)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                {t(step.bodyKey)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HowItWorksPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageIntro
        eyebrow={t("howItWorks.eyebrow")}
        title={t("howItWorks.title")}
        description={t("howItWorks.description")}
      />

      <section className="sarura-container py-10 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <StepList
            title={t("howItWorks.farmersTitle")}
            description={t("howItWorks.farmersDescription")}
            steps={farmerSteps}
          />
          <StepList
            title={t("howItWorks.buyersTitle")}
            description={t("howItWorks.buyersDescription")}
            steps={buyerSteps}
          />
        </div>

        <div className="mt-8 rounded-xl border border-sarura-green bg-sarura-green-light p-6">
          <h2 className="text-xl font-bold text-sarura-ink">{t("howItWorks.ctaTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sarura-gray">
            {t("howItWorks.ctaBody")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/marketplace" className={buttonStyles()}>
              {t("howItWorks.browseAction")}
            </Link>
            <Link to="/sell" className={buttonStyles({ variant: "secondary" })}>
              {t("howItWorks.sellAction")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
