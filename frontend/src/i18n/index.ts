import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import rw from "./locales/rw.json";

export type Language = "rw" | "en";

export const DEFAULT_LANGUAGE: Language = "rw";
export const LANGUAGE_STORAGE_KEY = "sarura.language";

export function normalizeLanguage(value?: string | null): Language {
  return value?.toLowerCase().startsWith("en") ? "en" : "rw";
}

export function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored ? normalizeLanguage(stored) : DEFAULT_LANGUAGE;
}

const initialLanguage = getInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    rw: { translation: rw },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  const normalized = normalizeLanguage(language);
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLanguage;
}

export default i18n;
