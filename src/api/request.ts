import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from './types'

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 10000,
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('PowerJwt')
    const appId = localStorage.getItem('Power_appId')

    if (token) {
      config.headers['PowerJwt'] = token
    }
    if (appId && !config.headers['AppId']) {
      config.headers['AppId'] = appId
    }

    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
service.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (response: AxiosResponse<ApiResponse>): any => {
    const { data, config } = response

    if (data.code === '-100') {
      ElMessage.warning('USER_NEED_LOGIN')
      // 动态导入避免循环依赖
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const router = require('@/router').default
      router.push('/')
      return Promise.reject(new Error('Unauthorized'))
    }

    if (config.url?.startsWith('/container')) {
      return response
    }

    if (data.success) {
      return data.data
    }

    ElMessage.warning(`ERROR：${data.message}`)
    return Promise.reject(new Error(data.message))
  },
  (error) => {
    ElMessage.error(error.toString())
    return Promise.reject(error)
  }
)

export const request = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, config)
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, config)
  },
}

export default service
