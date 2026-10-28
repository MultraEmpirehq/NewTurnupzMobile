import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resolveLanguage, useLanguageStore } from "@/shared/stores/language.store";
import enGB from "./locales/en-GB";
import enUS from "./locales/en-US";
import fr from "./locales/fr";

/**
 * The app's words in each language. British English is the full set; US
 * English only lists what's spelt or said differently, and anything a
 * language hasn't got yet falls back to British English.
 *
 * In a screen: `const { t } = useTranslation();` then `t("settings.title")`.
 */

void i18n.use(initReactI18next).init({
  resources: {
    "en-GB": { translation: enGB },
    "en-US": { translation: enUS },
    fr: { translation: fr }
  },
  lng: resolveLanguage(useLanguageStore.getState().choice),
  fallbackLng: "en-GB",
  interpolation: { escapeValue: false },
  returnNull: false
});

// Switch the moment it's changed in Settings.
useLanguageStore.subscribe((state) => {
  const language = resolveLanguage(state.choice);
  if (i18n.language !== language) void i18n.changeLanguage(language);
});

export default i18n;
