/* eslint-disable react-refresh/only-export-components -- context module: provider + hook/helpers belong together */
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./en";
import { es } from "./es";
import { nl } from "./nl";

export type Lang = "en" | "nl" | "es";
export type TranslationKey = keyof typeof en;
export type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, nl, es };

// Intl locales per language; Spanish is Colombian Spanish.
const intlLocales: Record<Lang, string> = { en: "en-GB", nl: "nl-NL", es: "es-CO" };

export const languages: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "nl", flag: "🇳🇱", label: "Nederlands" },
  { code: "es", flag: "🇨🇴", label: "Español" }
];

const STORAGE_KEY = "lang";

function detectLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "nl" || stored === "es") return stored;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("nl")) return "nl";
  if (nav.startsWith("es")) return "es";
  return "en";
}

type I18nContextValue = {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  t: Translator;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[lang];
    const t: Translator = (key, params) => {
      let text = dict[key] ?? en[key];
      if (params) {
        for (const [name, param] of Object.entries(params)) {
          text = text.split(`{${name}}`).join(String(param));
        }
      }
      return text;
    };
    return { lang, locale: intlLocales[lang], setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}

// Intl abbreviations for nl/es end in a period ("jan.", "ene.") - strip it to match the compact UI.
export function shortWeekday(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date).replace(/\.$/, "");
}

export function shortMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(/\.$/, "");
}

// Difficulty values are stored in English ("easy"/"medium"/"hard"); translate known ones for display.
export function difficultyLabel(t: Translator, difficulty?: string | null): string {
  if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
    return t(`difficulty.${difficulty}`);
  }
  return difficulty || t("difficulty.unknown");
}
