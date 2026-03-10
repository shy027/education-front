/** 通用 API 响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页响应格式（对齐后端 PageResult：数据字段为 list） */
export interface PageResponse<T> {
  total: number
  pageNum?: number
  pageSize?: number
  list: T[]          // 后端 PageResult 实际字段名
  records?: T[]      // 兼容旧调用点（不再使用）
}

/** 分页查询参数 */
export interface PageQuery {
  pageNum?: number
  pageSize?: number
}
