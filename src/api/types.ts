/** API 通用响应结构 */
export interface ApiResponse<T = unknown> {
  success: boolean
  code: string
  message: string
  data: T
}

/** 分页请求参数 */
export interface PageParams {
  index: number
  pageSize: number
  appId?: string
}

/** 分页响应结构 */
export interface PageResult<T> {
  data: T[]
  totalItems: number
  totalPages: number
  pageSize: number
}
