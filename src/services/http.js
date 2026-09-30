import axios from 'axios'
import JSONbig from 'json-bigint'
import { ElMessage } from 'element-plus'
import { apiBaseUrl } from '../config.js'

const losslessJSON = JSONbig({ storeAsString: true })
export function parseResponse(data) {
  if (typeof data !== 'string' || !data.trim()) return data
  try { return losslessJSON.parse(data) } catch { return data }
}

export function createHttpClient({ router, translate = key => key, storage = localStorage, notify = ElMessage, baseURL = apiBaseUrl, adapter } = {}) {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    transformResponse: [parseResponse],
    ...(adapter ? { adapter } : {}),
  })
  client.interceptors.request.use(request => {
    const jwt = storage.getItem('PowerJwt')
    const appId = storage.getItem('Power_appId')
    if (jwt && !request.headers.has('PowerJwt')) request.headers.set('PowerJwt', jwt)
    if (!request.headers.has('AppId') && appId) request.headers.set('AppId', appId)
    return request
  })
  client.interceptors.response.use(response => {
    if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') return response
    const result = response.data
    if (String(result?.code) === '-100') {
      // A temporary registration token or a late response from a previous
      // session must not invalidate the user's current login.
      const requestJwt = response.config.headers.get('PowerJwt') || null
      const currentJwt = storage.getItem('PowerJwt')
      if (requestJwt === currentJwt) {
        storage.removeItem('PowerJwt')
        router?.replace('/loginHomepage')
      }
      notify.warning(translate('message.userNeedLogin'))
      return Promise.reject(new Error(result.message || 'USER_NEED_LOGIN'))
    }
    if (result?.success === false) {
      const error = new Error(result.message || result.msg || translate('message.requestFailed'))
      notify.warning(error.message)
      return Promise.reject(error)
    }
    // Container callers need headers and the full ResultDTO; preserve that API.
    const path = new URL(response.config.url, 'http://console.invalid/').pathname
    if (path.startsWith('/container/')) return response
    if (result?.success === true) return result.data
    const error = new Error(translate('message.invalidResponse'))
    notify.error(error.message)
    return Promise.reject(error)
  }, error => {
    if (!['blob', 'arraybuffer'].includes(error.config?.responseType)) notify.error(error.message || translate('message.requestFailed'))
    return Promise.reject(error)
  })
  return client
}
