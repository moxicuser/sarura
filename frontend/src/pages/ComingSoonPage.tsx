import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { buttonStyles } from "../components/ui";

export function ComingSoonPage({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { t } = useTranslation();

  return (
    <section className="sarura-container py-16 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sarura-green-dark">
          {t("comingSoon.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-sarura-ink sm:text-4xl">
          {t(titleKey)}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-sarura-gray">{t(bodyKey)}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/marketplace" className={buttonStyles()}>
            {t("comingSoon.browse")}
          </Link>
          <Link to="/how-it-works" className={buttonStyles({ variant: "secondary" })}>
            {t("nav.howItWorks")}
          </Link>
        </div>
      </div>
    </section>
  );
}
