import { useTranslation } from "react-i18next";

import { normalizeLanguage } from "../../i18n";
import { cx } from "../../lib/cx";

const languageLabels = {
  rw: "common.kinyarwanda",
  en: "common.english",
} as const;

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className="inline-flex items-center rounded-full border border-sarura-border bg-white p-0.5"
    >
      {(["rw", "en"] as const).map((language) => (
        <button
          key={language}
          type="button"
          aria-pressed={current === language}
          aria-label={t(languageLabels[language])}
          onClick={() => {
            if (current !== language) {
              void i18n.changeLanguage(language);
            }
          }}
          className={cx(
            "min-h-7 rounded-full px-2.5 text-xs font-bold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sarura-green focus-visible:ring-offset-1",
            current === language
              ? "bg-sarura-green text-white"
              : "text-sarura-gray hover:text-sarura-green-dark",
          )}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
