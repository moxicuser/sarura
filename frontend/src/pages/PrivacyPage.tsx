import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PageIntro } from "../components/layout/PageIntro";

// [review] Placeholder privacy inbox until the founder confirms it.
const PRIVACY_EMAIL = "privacy@sarura.rw";

const sections = [
  { titleKey: "privacy.collectTitle", bodyKeys: ["privacy.collectBody"] },
  { titleKey: "privacy.whyTitle", bodyKeys: ["privacy.whyBody"] },
  { titleKey: "privacy.whoTitle", bodyKeys: ["privacy.whoBody", "privacy.whoBodyTwo"] },
  { titleKey: "privacy.chatsTitle", bodyKeys: ["privacy.chatsBody"] },
  { titleKey: "privacy.retentionTitle", bodyKeys: ["privacy.retentionBody"] },
  { titleKey: "privacy.rightsTitle", bodyKeys: ["privacy.rightsBody", "privacy.rightsBodyTwo"] },
  { titleKey: "privacy.securityTitle", bodyKeys: ["privacy.securityBody"] },
  { titleKey: "privacy.contactTitle", bodyKeys: ["privacy.contactBody"] },
] as const;

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageIntro
        eyebrow={t("privacy.eyebrow")}
        title={t("privacy.title")}
        description={t("privacy.description")}
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

          <p className="rounded-xl border border-sarura-amber/50 bg-white p-4 text-sm leading-relaxed text-sarura-gray">
            {t("privacy.legalNote")}
          </p>

          <div className="border-t border-sarura-border pt-6">
            <h2 className="text-xl font-bold text-sarura-ink">{t("privacy.moreTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-sarura-gray">
              {t("privacy.moreBody")}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <Link to="/policies" className="text-sarura-green-dark hover:underline">
                {t("nav.policies")}
              </Link>
              <Link to="/contact" className="text-sarura-green-dark hover:underline">
                {t("nav.contact")}
              </Link>
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="text-sarura-green-dark hover:underline"
              >
                {PRIVACY_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
