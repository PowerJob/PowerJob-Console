import JSONBig from 'json-bigint';

export type DataRecord = Record<string, any>;
export type Id = string | number;
export interface PageResult<T = DataRecord> { data: T[]; totalItems: number; pageSize: number; index?: number; totalPages?: number }
const json = JSONBig({ storeAsString: true, protoAction: 'error', constructorAction: 'error' });
export const parseJson = (text: string): any => json.parse(text);
export const stringifyJson = (value: unknown, space?: number): string => JSON.stringify(value, null, space);
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';
export interface RequestOptions { headers?: Record<string, string>; params?: Record<string, any>; timeout?: number; signal?: AbortSignal; responseType?: 'blob'; quiet?: boolean }
export class ApiError extends Error { constructor(message: string, public code?: string, public status?: number) { super(message); } }
export const endpoint = (path: string, params?: Record<string, any>) => {
  const base = new URL(API_BASE.endsWith('/') ? API_BASE : API_BASE + '/', window.location.href.split('#')[0]);
  const url = new URL(path.replace(/^\//, ''), base);
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)); });
  return url;
};
export function websocketUrl(path: string) { const url = endpoint(path); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; return url.toString(); }
async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, options.timeout ?? 15000);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const headers: Record<string, string> = { ...options.headers };
  const token = localStorage.getItem('PowerJwt');
  const appId = localStorage.getItem('Power_appId');
  let currentSessionExpired = false;
  if (token) headers.PowerJwt = token;
  if (appId && !Object.keys(headers).some(k => k.toLowerCase() === 'appid')) headers.AppId = appId;
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  try {
    if (controller.signal.aborted) throw new DOMException('请求已取消 / Request canceled', 'AbortError');
    const response = await fetch(endpoint(path, options.params), { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : stringifyJson(body), signal: controller.signal, credentials: 'same-origin' });
    const contentType = (response.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
    if (options.responseType === 'blob' && response.ok && contentType === 'application/octet-stream') return await response.blob() as T;
    const text = await response.text();
    let result: any;
    try { result = text ? parseJson(text) : null; } catch { throw new ApiError(response.ok ? options.responseType === 'blob' ? '服务未返回有效的日志文件 / Server did not return a valid log file' : '服务返回了无法解析的数据 / Invalid server response' : `请求失败 / Request failed (${response.status})`, undefined, response.status); }
    if (String(result?.code) === '-100') { if (localStorage.getItem('PowerJwt') === token) { currentSessionExpired = true; window.dispatchEvent(new Event('powerjob:unauthorized')); } throw new ApiError('登录已过期，请重新登录 / Please sign in again', '-100'); }
    if (!response.ok || result?.success === false) throw new ApiError(result?.message || result?.msg || result?.error || `请求失败 / Request failed (${response.status})`, result?.code, response.status);
    if (options.responseType === 'blob') throw new ApiError('服务未返回有效的日志文件 / Server did not return a valid log file', undefined, response.status);
    return (result && typeof result === 'object' && 'success' in result ? result.data : result) as T;
  } catch (error) {
    const failure = timedOut && !options.signal?.aborted ? new ApiError('请求超时，请重试 / Request timed out', 'TIMEOUT') : error instanceof Error ? error : new Error(String(error));
    if (!options.quiet && !options.signal?.aborted && (currentSessionExpired || localStorage.getItem('PowerJwt') === token)) window.dispatchEvent(new CustomEvent('powerjob:error', { detail: failure.name === 'AbortError' ? '请求超时，请重试 / Request timed out' : failure.message }));
    throw failure;
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}
export const api = {
  get: <T = any>(path: string, params?: Record<string, any>, options?: RequestOptions) => request<T>('GET', path, undefined, { ...options, params }),
  post: <T = any>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  delete: <T = any>(path: string, params?: Record<string, any>, options?: RequestOptions) => request<T>('DELETE', path, undefined, { ...options, params }),
};
export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
