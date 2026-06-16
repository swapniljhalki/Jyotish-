// i18n setup — locked to English. Language switcher has been removed.
// Strings live in /app/frontend/src/i18n/locales/en.json.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";

// Clear any previously persisted non-English language so older sessions
// don't see stale translations.
try {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem("snw_lang");
  }
} catch (_) {
  // ignore (private mode)
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en"],
    interpolation: { escapeValue: false },
  });

export default i18n;
