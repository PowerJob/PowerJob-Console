import JSONbig from 'json-bigint'
import { session, signOut } from './session'
import { t, toast } from './ui'

declare global { interface Window { POWERJOB_CONFIG?: {apiBaseUrl?: string} } }
const json = JSONbig({storeAsString: true})
const configured = window.POWERJOB_CONFIG?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL
export const apiBaseUrl: string = configured
  ? configured.replace(/\/$/, '')
  : import.meta.env.DEV ? '/api' : (new URL('./', location.href.split('#')[0]).pathname.replace(/\/$/, '') || '')
export interface RequestOptions {
  method?: string; query?: Record<string, unknown>; body?: unknown; headers?: Record<string, string>
  signal?: AbortSignal; blob?: boolean; quiet?: boolean; timeout?: number
}
export function endpoint(path: string, query: Record<string, unknown> = {}) {
  const url = new URL(apiBaseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, ''), location.href)
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue
    if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, String(item)))
    else url.searchParams.set(key, String(value))
  }
  return url.toString()
}
export function websocketUrl(path: string) {
  const url = new URL(endpoint(path)); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; return url.toString()
}
export function parseJSON(text: string): any { return json.parse(text) }
export async function api<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('PowerJwt') && session.jwt) headers.set('PowerJwt', session.jwt)
  if (!headers.has('AppId') && session.appId) headers.set('AppId', session.appId)
  const sentJWT = headers.get('PowerJwt')
  const sentRevision = session.revision
  const controller = new AbortController()
  const abort = () => controller.abort()
  options.signal?.addEventListener('abort', abort, {once:true})
  if (options.signal?.aborted) controller.abort()
  const timer = setTimeout(abort, options.timeout ?? 10000)
  try {
    const form = options.body instanceof FormData
    if (options.body !== undefined && !form) headers.set('Content-Type', 'application/json')
    const response = await fetch(endpoint(path, options.query), {
      method: options.method || (options.body === undefined ? 'GET' : 'POST'), headers, credentials: 'same-origin',
      body: options.body === undefined ? undefined : form ? options.body as FormData : JSON.stringify(options.body),
      signal: controller.signal,
    })
    const contentType = response.headers.get('Content-Type') || ''
    if (options.blob && response.ok && /^(application\/(?:octet-stream|zip|x-zip-compressed)|text\/plain)(?:;|$)/i.test(contentType)) return await response.blob() as T
    const text = await response.text()
    let result: any
    try { result = parseJSON(text) } catch { throw new Error(t('服务返回了无法识别的数据','The server returned an unreadable response')) }
    if (String(result?.code) === '-100') {
      if (sentJWT === localStorage.getItem('PowerJwt') && sentRevision === session.revision) signOut()
      throw new Error(result.message || result.msg || t('登录已失效，请重新登录','Your session expired. Sign in again.'))
    }
    if (!response.ok || result?.success !== true) throw new Error(result?.message || result?.msg || t('请求未完成，请重试','The request failed. Try again.'))
    if (options.blob) throw new Error(t('下载返回了错误信息','The download returned an error'))
    return result.data as T
  } catch (error) {
    const value = error as Error
    if (value.name !== 'AbortError' && !options.quiet && !options.signal?.aborted) toast(value.message, 'error')
    throw error
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort) }
}
export async function download(path: string, query: Record<string, unknown> = {}, filename = 'download') {
  const blob = await api<Blob>(path, {query, blob:true,timeout:75000})
  saveBlob(blob,filename)
}
export function saveBlob(blob:Blob,filename:string) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a')
  link.href = url; link.download = filename; document.body.appendChild(link)
  try{link.click()}finally{link.remove();setTimeout(() => URL.revokeObjectURL(url), 1000)}
}
