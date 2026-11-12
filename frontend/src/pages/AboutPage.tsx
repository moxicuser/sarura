import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";
import { buttonStyles } from "../components/ui";

const steps = [
  { titleKey: "about.stepListTitle", bodyKey: "about.stepListBody" },
  { titleKey: "about.stepDiscoverTitle", bodyKey: "about.stepDiscoverBody" },
  { titleKey: "about.stepNegotiateTitle", bodyKey: "about.stepNegotiateBody" },
] as const;

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageIntro
        eyebrow={t("about.eyebrow")}
        title={t("about.title")}
        description={t("about.description")}
      />

      <section className="sarura-container py-10 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-sarura-border bg-white p-6">
            <h2 className="text-xl font-bold text-sarura-ink">{t("about.problemTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-sarura-gray">
              {t("about.problemBody")}
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-sarura-ink">{t("about.farmersTitle")}</h3>
                <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                  {t("about.farmersBody")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-sarura-ink">{t("about.buyersTitle")}</h3>
                <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                  {t("about.buyersBody")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-sarura-green bg-sarura-green-light p-6">
            <h2 className="text-xl font-bold text-sarura-ink">{t("about.missionTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-sarura-gray">
              {t("about.missionBody")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-sarura-gray">
              {t("about.missionBodyTwo")}
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight text-sarura-ink">
            {t("about.howTitle")}
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.titleKey} className="rounded-xl border border-sarura-border bg-white p-5">
                <p className="text-xs font-bold tracking-[0.16em] text-sarura-green">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg font-bold text-sarura-ink">{t(step.titleKey)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-sarura-gray">
                  {t(step.bodyKey)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-sarura-border bg-white p-6">
            <h2 className="text-xl font-bold text-sarura-ink">{t("about.storyTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-sarura-gray">
              {t("about.storyBody")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-sarura-gray">
              {t("about.storyBodyTwo")}
            </p>
          </section>

          <section className="rounded-xl border border-sarura-border bg-white p-6">
            <h2 className="text-xl font-bold text-sarura-ink">{t("about.teamTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-sarura-gray">
              {t("about.teamBody")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-sarura-gray">
              {t("about.teamBodyTwo")}
            </p>
            <Link
              to="/contact"
              className={buttonStyles({ variant: "secondary", className: "mt-5" })}
            >
              {t("about.contactAction")}
            </Link>
          </section>
        </div>
      </section>
    </>
  );
}
