import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { sq } from './sq'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      sq: { translation: sq },
    },
    lng: 'sq',              // default language
    fallbackLng: 'sq',      // if a key is missing, use Albanian (the only language for now)
    interpolation: {
      escapeValue: false,   // React already escapes
    },
  })

export default i18n