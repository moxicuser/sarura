import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";
import { buttonStyles } from "../components/ui";
import { useAuth } from "../lib/auth";

export function SellPage() {
  const { t } = useTranslation();
  const { status, user } = useAuth();
  const signedIn = status === "authenticated" && user;
  const isFarmer = Boolean(user?.is_farmer);

  return (
    <>
      <PageIntro
        eyebrow={t("sell.eyebrow")}
        title={t("sell.title")}
        description={t("sell.description")}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          {signedIn ? (
            <Link to="/dashboard" className={buttonStyles()}>
              {t("sell.dashboardAction")}
            </Link>
          ) : (
            <Link to="/register?role=farmer" className={buttonStyles()}>
              {t("sell.createAction")}
            </Link>
          )}
          <Link to="/how-it-works" className={buttonStyles({ variant: "secondary" })}>
            {t("nav.howItWorks")}
          </Link>
        </div>
      </PageIntro>

      <section className="sarura-container py-10 lg:py-14">
        {signedIn && !isFarmer && (
          <div className="mb-8 rounded-xl border border-sarura-amber/50 bg-white p-5">
            <h2 className="text-base font-bold text-sarura-ink">{t("sell.buyerTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("sell.buyerBody")}
            </p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-3">
          <article className="rounded-xl border border-sarura-border bg-white p-5">
            <h2 className="text-base font-bold text-sarura-ink">{t("sell.stepListTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("sell.stepListBody")}
            </p>
          </article>
          <article className="rounded-xl border border-sarura-border bg-white p-5">
            <h2 className="text-base font-bold text-sarura-ink">{t("sell.stepAnswerTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("sell.stepAnswerBody")}
            </p>
          </article>
          <article className="rounded-xl border border-sarura-border bg-white p-5">
            <h2 className="text-base font-bold text-sarura-ink">{t("sell.stepAgreeTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("sell.stepAgreeBody")}
            </p>
          </article>
        </div>

        <div className="mt-8 rounded-xl border border-sarura-border bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-sarura-ink">{t("sell.requirementsTitle")}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-sarura-gray">
            <li>{t("sell.requirementOne")}</li>
            <li>{t("sell.requirementTwo")}</li>
            <li>{t("sell.requirementThree")}</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-sarura-gray">{t("sell.note")}</p>
        </div>
      </section>
    </>
  );
}
