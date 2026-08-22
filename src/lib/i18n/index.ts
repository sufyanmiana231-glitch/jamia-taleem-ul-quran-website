export { DEFAULT_LOCALE, LOCALES, LOCALE_DIRECTION, LOCALE_LABEL } from "./config";
export type { Locale } from "./config";
export { LocaleProvider, useLocale } from "./LocaleProvider";
export type { Dictionary } from "./dictionaries/ur";
export * from "./format";

import ur from "./dictionaries/ur";
/** Static dictionary for non-component contexts (services, scripts). UI code should prefer useLocale(). */
export const staticDictionary = ur;
