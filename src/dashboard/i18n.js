import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

const resources = {
    en: { translation: en },
    ru: { translation: ru },
};

// Start with the language stored in localStorage or default to 'en'
const storedLang = localStorage.getItem('errora_lang') || 'en';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: storedLang, // Current language
        fallbackLng: 'en', // Fallback language
        interpolation: {
            escapeValue: false, // React already safe from XSS
        },
    });

export default i18n;
