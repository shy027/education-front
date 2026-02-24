/** 通用 API 响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页响应格式 */
export interface PageResponse<T> {
  total: number
  pageNum: number
  pageSize: number
  records: T[]
}

/** 分页查询参数 */
export interface PageQuery {
  pageNum?: number
  pageSize?: number
}
