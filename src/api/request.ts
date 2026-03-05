import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse, ErrorCode } from './types'
import { getErrorMessage } from './types'

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
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
  error => Promise.reject(error)
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>): unknown => {
    const { data, config } = response

    // 处理未授权
    if (data.code === '-100') {
      ElMessage.warning('USER_NEED_LOGIN')
      // 动态导入避免循环依赖
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const router = require('@/router').default
      router.push('/')
      return Promise.reject(new Error('Unauthorized'))
    }

    // 容器接口直接返回完整响应
    if (config.url?.startsWith('/container')) {
      return response
    }

    // 成功返回数据
    if (data.success) {
      return data.data
    }

    // 显示错误消息
    const errorMsg = getErrorMessage(data.code as ErrorCode, data.message)
    ElMessage.warning(`ERROR：${errorMsg}`)
    return Promise.reject(new Error(data.message))
  },
  error => {
    // 网络错误处理
    const message = error.response?.data?.message || error.message || '网络请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

/**
 * 统一的请求方法
 */
export const request = {
  /**
   * GET 请求
   * @param url 请求路径
   * @param params 查询参数（可选）
   * @param config 额外配置（可选）
   */
  get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, { params, ...config })
  },

  /**
   * POST 请求
   * @param url 请求路径
   * @param data 请求体数据（可选）
   * @param config 额外配置（可选）
   */
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  },

  /**
   * DELETE 请求
   * @param url 请求路径
   * @param params 查询参数（可选）
   * @param config 额外配置（可选）
   */
  delete<T>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return service.delete(url, { params, ...config })
  },

  /**
   * PUT 请求
   * @param url 请求路径
   * @param data 请求体数据（可选）
   * @param config 额外配置（可选）
   */
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config)
  }
}

export default service
