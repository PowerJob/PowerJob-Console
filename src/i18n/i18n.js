import { createI18n } from 'vue-i18n'
import messages from './langs/index.js'

const saved = localStorage.getItem('oms_lang') || localStorage.getItem('lang')
const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: saved === 'en' ? 'en' : 'cn',
  fallbackLocale: 'cn',
  messages,
})
export default i18n
