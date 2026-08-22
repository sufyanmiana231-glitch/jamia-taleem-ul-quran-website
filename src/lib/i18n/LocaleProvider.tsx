"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_DIRECTION, type Locale } from "./config";
import ur from "./dictionaries/ur";
import en from "./dictionaries/en";
import type { Dictionary } from "./dictionaries/ur";

const dictionaries: Record<Locale, Dictionary> = { ur, en };

const STORAGE_KEY = "jamia:locale";

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Deliberately not read in a lazy useState initializer: localStorage is
    // unavailable during SSR, so the server always renders DEFAULT_LOCALE.
    // Reading it here (once, post-hydration) keeps the first client render
    // identical to the server's and avoids a hydration mismatch — the one
    // extra render this causes is an accepted, standard trade-off for that.
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && dictionaries[stored]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_DIRECTION[locale];
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: LOCALE_DIRECTION[locale],
      t: dictionaries[locale],
      setLocale,
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
