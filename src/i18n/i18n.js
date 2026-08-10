import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources.js'

const savedLanguage = localStorage.getItem('di-ichi-language') || 'vi'

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (language) => {
  localStorage.setItem('di-ichi-language', language)
  document.documentElement.lang = language
})

document.documentElement.lang = savedLanguage

export default i18n
