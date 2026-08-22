export const LOCALES = ["ur", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ur";

export const LOCALE_DIRECTION: Record<Locale, "rtl" | "ltr"> = {
  ur: "rtl",
  en: "ltr",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  ur: "اردو",
  en: "English",
};
