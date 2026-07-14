import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = ["pt", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    fallbackLng: "pt",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pf_lang",
    },
  });

const HTML_LANG: Record<string, string> = { pt: "pt-BR", en: "en" };

function applyLang(lng: string) {
  const base = lng.split("-")[0];
  document.documentElement.lang = HTML_LANG[base] || base;
}

applyLang(i18n.language || "pt");
i18n.on("languageChanged", applyLang);

export default i18n;
