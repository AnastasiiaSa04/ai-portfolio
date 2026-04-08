import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import de from './locales/de.json';
import ru from './locales/ru.json';
import ua from './locales/ua.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      ru: { translation: ru },
      ua: { translation: ua },
    },
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;