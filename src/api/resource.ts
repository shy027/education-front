import { get, post } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

/** 资源查询参数 */
export interface ResourceQuery extends PageQuery {
  keyword?: string
  categoryId?: string
  tagIds?: string[]
  status?: string
}

/** 获取资源列表 */
export const getResourceList = (params?: ResourceQuery) =>
  get<PageResponse<Record<string, unknown>>>('/v1/resources', params)

/** 获取资源详情 */
export const getResourceDetail = (resourceId: string) =>
  get<Record<string, unknown>>(`/v1/resources/${resourceId}`)

/** 教师：创建资源草稿 */
export const createResource = (data: Record<string, unknown>) =>
  post<{ resourceId: string }>('/v1/resources', data)

/** 教师：提交资源审核 */
export const submitResourceAudit = (resourceId: string) =>
  post<void>(`/v1/resources/${resourceId}/submit`)

/** 获取资源分类列表 */
export const getCategories = () =>
  get<Record<string, unknown>[]>('/v1/resources/categories')

/** 获取标签列表 */
export const getTags = (params?: { keyword?: string }) =>
  get<Record<string, unknown>[]>('/v1/resources/tags', params)
