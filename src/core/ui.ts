import { reactive, ref } from 'vue'

const stored = localStorage.getItem('oms_lang') || localStorage.getItem('lang') || navigator.language
export const locale = ref<'zh' | 'en'>(stored.toLowerCase().startsWith('en') ? 'en' : 'zh')
export function t(zh: string, en: string) { return locale.value === 'en' ? en : zh }
export function setLocale(value: 'zh' | 'en') {
  locale.value = value; localStorage.setItem('oms_lang', value === 'zh' ? 'cn' : 'en')
  document.documentElement.lang = value === 'zh' ? 'zh-CN' : 'en'
}
setLocale(locale.value)
export const notices = reactive<{id: number; message: string; type: string}[]>([])
let noticeID = 0
export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = ++noticeID; notices.push({id, message, type})
  setTimeout(() => { const index = notices.findIndex(item => item.id === id); if (index >= 0) notices.splice(index, 1) }, 6000)
}
export const confirmation = reactive({open: false, message: ''})
let resolveConfirmation: ((yes: boolean) => void) | undefined
export function confirmAction(message: string): Promise<boolean> {
  resolveConfirmation?.(false); confirmation.message = message; confirmation.open = true
  return new Promise(resolve => { resolveConfirmation = resolve })
}
export function answerConfirmation(yes: boolean) {
  confirmation.open = false; const resolve = resolveConfirmation; resolveConfirmation = undefined; resolve?.(yes)
}
export function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) }
export function formatTime(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && !/^\d+$/.test(value)) return value
  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return '—'
  const part = (number: number) => String(number).padStart(2, '0')
  return date.getFullYear() + '-' + part(date.getMonth() + 1) + '-' + part(date.getDate()) + ' ' + part(date.getHours()) + ':' + part(date.getMinutes()) + ':' + part(date.getSeconds())
}
export function instanceStatus(status: unknown) {
  return ({1:t('等待派发','Waiting'),2:t('等待 Worker','Dispatched'),3:t('运行中','Running'),4:t('失败','Failed'),5:t('成功','Succeeded'),9:t('已取消','Cancelled'),10:t('停止','Stopped')} as Record<string,string>)[String(status)] || '—'
}
export function downloadText(value: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([value], {type})); const link = document.createElement('a')
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
