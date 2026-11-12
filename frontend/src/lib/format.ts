import type { Language } from "../i18n";

function localeFor(language: Language): string {
  return language === "rw" ? "rw-RW" : "en-RW";
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(localeFor(language), {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPrice(value: string | number, language: Language): string {
  return new Intl.NumberFormat(localeFor(language), {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDate(value: string, language: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(localeFor(language), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatMonthYear(value: string, language: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(localeFor(language), {
    year: "numeric",
    month: "long",
  }).format(date);
}

export function localizedName(
  item: { name: string; name_rw?: string },
  language: Language,
): string {
  if (language === "rw" && item.name_rw) {
    return item.name_rw;
  }
  return item.name;
}

export type BadgeLevel = "account" | "identity" | "cooperative" | undefined;

export function badgeLevel(level: string | null | undefined): BadgeLevel {
  if (level === "account" || level === "identity" || level === "cooperative") {
    return level;
  }
  return undefined;
}
