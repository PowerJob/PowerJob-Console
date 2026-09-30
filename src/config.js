export function resolveApiBaseUrl(config = window.POWERJOB_CONFIG, env = import.meta.env) {
  const configured = config?.apiBaseUrl || env.VITE_API_BASE_URL
  if (configured) return configured.replace(/\/$/, '')
  if (env.DEV) return '/api'
  return new URL('./', window.location.href.split('#')[0]).pathname.replace(/\/$/, '') || '/'
}

export const apiBaseUrl = resolveApiBaseUrl()

export function websocketUrl(path, base = apiBaseUrl, location = window.location) {
  const url = new URL(`${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
