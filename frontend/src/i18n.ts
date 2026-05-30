import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // English natural keys are used directly, so no explicit mapping is strictly required.
          // This serves as a clean starting point for localization.
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values to prevent XSS
    }
  });

export default i18n;
