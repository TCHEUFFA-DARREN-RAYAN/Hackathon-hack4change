import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

const LOCALE_KEY = 'commonground-locale';

export const getStoredLocale = (): string => {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored) return stored;
    return navigator.language.startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'en';
  }
};

export const setStoredLocale = (locale: string) => {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {}
};

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: getStoredLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  setStoredLocale(lng);
  if (typeof document !== 'undefined') document.documentElement.lang = lng.startsWith('fr') ? 'fr' : 'en';
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = getStoredLocale().startsWith('fr') ? 'fr' : 'en';
}

export default i18n;
