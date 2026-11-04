import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources.js'
import { languageForLocale, localeFromPath, preferredLocale } from './localeRouting.js'

const savedLanguage = languageForLocale(localeFromPath(window.location.pathname) || preferredLocale())

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (language) => {
  try { localStorage.setItem('di-ichi-language', language) } catch { /* URL remains the source of truth when storage is unavailable. */ }
  document.documentElement.lang = language
})

document.documentElement.lang = savedLanguage

export default i18n
