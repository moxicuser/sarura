import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";
import { buttonStyles } from "../components/ui";

const sections = [
  { titleKey: "policies.honestTitle", bodyKeys: ["policies.honestBody", "policies.honestBodyTwo"] },
  { titleKey: "policies.contactTitle", bodyKeys: ["policies.contactBody"] },
  { titleKey: "policies.abuseTitle", bodyKeys: ["policies.abuseBody"] },
  { titleKey: "policies.reportsTitle", bodyKeys: ["policies.reportsBody"] },
  { titleKey: "policies.ordersTitle", bodyKeys: ["policies.ordersBody"] },
  { titleKey: "policies.accountsTitle", bodyKeys: ["policies.accountsBody"] },
  { titleKey: "policies.enforcementTitle", bodyKeys: ["policies.enforcementBody"] },
  { titleKey: "policies.contactUsTitle", bodyKeys: ["policies.contactUsBody"] },
] as const;

export function PoliciesPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageIntro
        eyebrow={t("policies.eyebrow")}
        title={t("policies.title")}
        description={t("policies.description")}
      />

      <section className="sarura-container py-10 lg:py-14">
        <div className="max-w-3xl space-y-8">
          {sections.map((section) => (
            <section key={section.titleKey}>
              <h2 className="text-xl font-bold text-sarura-ink">{t(section.titleKey)}</h2>
              {section.bodyKeys.map((bodyKey) => (
                <p key={bodyKey} className="mt-3 text-sm leading-relaxed text-sarura-gray">
                  {t(bodyKey)}
                </p>
              ))}
            </section>
          ))}

          <div className="rounded-xl border border-sarura-border bg-white p-5">
            <h2 className="text-base font-bold text-sarura-ink">{t("policies.helpTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("policies.helpBody")}
            </p>
            <Link
              to="/contact"
              className={buttonStyles({ variant: "secondary", className: "mt-4" })}
            >
              {t("nav.contact")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
