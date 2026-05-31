// i18n setup — English / Hindi / Telugu / Tamil.
// Strings live in /app/frontend/src/i18n/locales/<code>.json
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import te from "./locales/te.json";
import ta from "./locales/ta.json";

export const LANGUAGES = [
  { code: "en", label: "English",  native: "English"  },
  { code: "hi", label: "Hindi",    native: "हिन्दी"     },
  { code: "te", label: "Telugu",   native: "తెలుగు"   },
  { code: "ta", label: "Tamil",    native: "தமிழ்"    },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
      ta: { translation: ta },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "hi", "te", "ta"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "snw_lang",
    },
  });

export default i18n;
