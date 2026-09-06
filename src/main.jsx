import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from 'sonner'
import './styles/global.css'
import '@livekit/components-styles'
import App from './App.jsx'
import i18n from './i18n/i18n.js'
import { I18nDomTranslator } from './i18n/I18nDomTranslator.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <I18nDomTranslator />
      <App />
      <Toaster richColors position="top-right" />
    </I18nextProvider>
  </StrictMode>,
)
