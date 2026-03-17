import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi }
};

const hasWindow = globalThis.window !== undefined;
const savedLanguage = hasWindow
  ? globalThis.window.localStorage.getItem('language')
  : null;
const defaultLanguage = savedLanguage === 'vi' || savedLanguage === 'en' ? savedLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi'],
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
