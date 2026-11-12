import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { buttonStyles } from "../components/ui";

const pageTitles: Record<string, string> = {
  "/marketplace": "nav.marketplace",
  "/how-it-works": "nav.howItWorks",
  "/sell": "nav.sell",
  "/about": "nav.about",
  "/contact": "nav.contact",
  "/privacy": "nav.privacy",
  "/policies": "nav.policies",
  "/login": "nav.login",
  "/register": "nav.register",
};

export function PlaceholderPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const titleKey = pageTitles[pathname];

  return (
    <section className="sarura-container py-16 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sarura-green-dark">
          {t("placeholder.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-sarura-ink sm:text-4xl">
          {titleKey ? t(titleKey) : t("placeholder.title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-sarura-gray">
          {t("placeholder.body")}
        </p>
        <p className="mt-4 font-mono text-sm text-sarura-gray">{pathname}</p>
        <Link
          to="/"
          className={buttonStyles({ variant: "secondary", className: "mt-8" })}
        >
          {t("placeholder.backHome")}
        </Link>
      </div>
    </section>
  );
}
