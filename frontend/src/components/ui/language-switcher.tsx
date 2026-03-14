'use client';

import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLocale = () => {
    const next = i18n.language.startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors border border-white/20"
      aria-label={i18n.language.startsWith('fr') ? t('language.switchToEnglish') : t('language.switchToFrench')}
    >
      {i18n.language.startsWith('fr') ? 'EN' : 'FR'}
    </button>
  );
}
