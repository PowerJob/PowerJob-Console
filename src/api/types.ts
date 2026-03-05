/** API 通用响应结构 */
export interface ApiResponse<T = unknown> {
  success: boolean
  code: string
  message: string
  data: T
}

/** 分页请求参数 */
export interface PageParams {
  /** 页码（从 0 开始） */
  index: number
  /** 每页条数 */
  pageSize: number
  /** 应用 ID */
  appId?: string
}

/** 分页响应结构 */
export interface PageResult<T> {
  /** 数据列表 */
  data: T[]
  /** 总条数 */
  totalItems: number
  /** 总页数 */
  totalPages: number
  /** 每页条数 */
  pageSize: number
}

/** 错误码枚举 */
export enum ErrorCode {
  /** 未授权/登录过期 */
  UNAUTHORIZED = '-100',
  /** 禁止访问 */
  FORBIDDEN = '-101',
  /** 资源不存在 */
  NOT_FOUND = '-102',
  /** 内部服务器错误 */
  INTERNAL_ERROR = '-500'
}

/** 错误码映射消息 */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: '登录已过期，请重新登录',
  [ErrorCode.FORBIDDEN]: '没有权限执行此操作',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误'
}

/**
 * 获取错误消息
 */
export function getErrorMessage(code: ErrorCode | string, defaultMessage?: string): string {
  return ErrorMessages[code as ErrorCode] || defaultMessage || '请求失败'
}

/** 请求配置扩展 */
export interface RequestOptions {
  /** 是否显示错误提示 */
  showError?: boolean
  /** 自定义错误消息 */
  errorMessage?: string
  /** 请求超时时间（毫秒） */
  timeout?: number
}

/** API 返回类型工具 */
export type ApiReturnType<T> = Promise<T>

/** 提取 API 方法的返回类型 */
export type ExtractApiReturnType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never

/** 提取 API 方法的参数类型 */
export type ExtractApiParams<T> = T extends (...args: infer P) => Promise<any> ? P : never
