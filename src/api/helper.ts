import type { AxiosRequestConfig } from 'axios'

/**
 * 过滤对象中的 undefined 和 null 值
 */
export function filterEmptyParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = value
    }
  }

  return result as Partial<T>
}

/**
 * 将对象转换为 URL 查询字符串
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const filtered = filterEmptyParams(params)
  const entries = Object.entries(filtered)

  if (entries.length === 0) {
    return ''
  }

  const searchParams = new URLSearchParams()

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      value.forEach(item => searchParams.append(key, String(item)))
    } else {
      searchParams.append(key, String(value))
    }
  }

  return searchParams.toString()
}

/**
 * 构建 GET 请求的完整 URL
 */
export function buildUrl(path: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return path
  }

  const queryString = buildQueryString(params)
  return queryString ? `${path}?${queryString}` : path
}

/**
 * 创建带查询参数的 GET 请求配置
 */
export function createGetConfig<T extends Record<string, unknown>>(params: T): AxiosRequestConfig {
  return {
    params: filterEmptyParams(params)
  }
}

/**
 * 错误码枚举
 */
export enum ErrorCode {
  UNAUTHORIZED = '-100',
  FORBIDDEN = '-101',
  NOT_FOUND = '-102',
  INTERNAL_ERROR = '-500'
}

/**
 * 错误码映射消息
 */
export const ErrorMessages: Record<string, string> = {
  [ErrorCode.UNAUTHORIZED]: '登录已过期，请重新登录',
  [ErrorCode.FORBIDDEN]: '没有权限执行此操作',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误'
}

/**
 * 获取错误消息
 */
export function getErrorMessage(code: string, defaultMessage?: string): string {
  return ErrorMessages[code] || defaultMessage || '请求失败'
}
