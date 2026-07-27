import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import hiTranslation from './locales/hi.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      hi: {
        translation: hiTranslation,
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  if (lng === 'hi') {
    document.body.classList.add('lang-hi');
  } else {
    document.body.classList.remove('lang-hi');
  }
});

// Set initial value
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  if (i18n.language === 'hi') {
    document.body.classList.add('lang-hi');
  }
}

export default i18n;
