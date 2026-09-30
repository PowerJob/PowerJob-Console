import en from './en.js'
import cn from './cn.js'
import { cn as cnExtras, en as enExtras } from './enhancements.js'
export default {
  en: { message: { ...en.message, ...enExtras } },
  cn: { message: { ...cn.message, ...cnExtras } },
}
