// i18n setup — English + Hindi + Telugu, with browser-language-detector
// persisting the choice under localStorage key "snw_lang". The <html lang>
// attribute is synced by LanguagePicker so CSS can swap Noto fonts per script.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import te from "./locales/te.json";

/** Ordered list of the languages we officially ship. Exported so the
 *  LanguagePicker component can render options in one place. */
export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi",   native: "हिन्दी" },
  { code: "te", label: "Telugu",  native: "తెలుగు" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
    },
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    // Ignore region tags — treat "hi-IN" / "en-US" as their base language.
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    detection: {
      // localStorage first (so the user's explicit pick sticks), then
      // navigator, then <html lang>. Persist any new pick under snw_lang.
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "snw_lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
