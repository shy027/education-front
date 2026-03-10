/**
 * 资源服务 API
 * 后端路由前缀：/api/v1
 */
import { get, post, put, del, upload } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

// ===================== 类型定义 =====================

export interface ResourceItem {
  id: string
  title: string
  summary?: string
  coverUrl?: string
  resourceType: number          // 1=文章 2=视频 3=文档 4=音频
  status: number                // 0=草稿 1=待审核 2=已发布 3=已下架 4=审核拒绝
  categoryId?: string
  categoryName?: string
  tags: { id: string; tagName: string }[]
  creatorId: string
  creatorName: string
  viewCount: number
  fileUrl?: string
  content?: string
  createdTime: string
  attachments?: AttachmentInfo[]
}

export interface AttachmentInfo {
  id?: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType?: string
}

export interface ResourceCreateReq {
  title: string
  content?: string
  coverUrl?: string
  categoryId?: string
  tagIds?: string[]
  resourceType: number
  fileUrl?: string
  summary?: string
}

export interface ResourceQuery extends PageQuery {
  keyword?: string
  categoryId?: string
  status?: number
  creatorId?: string
  tagId?: string
}

export interface CategoryNode {
  id: string
  categoryName: string
  parentId?: string
  sortOrder: number
  children: CategoryNode[]
}

export interface TagItem {
  id: string
  tagName: string
  categoryId?: string
  status: number
}

export interface AuditLog {
  id: string
  auditorId: string
  auditorName: string
  auditResult: number
  auditRemark?: string
  auditTime: string
}

// ===================== 资源 CRUD =====================

export const getResourceList = (params: ResourceQuery) =>
  get<PageResponse<ResourceItem>>('/v1/resources', params)

export const getResourceDetail = (id: string) =>
  get<ResourceItem>(`/v1/resources/${id}`)

export const createResource = (data: ResourceCreateReq) =>
  post<string>('/v1/resources', data)

export const updateResource = (id: string, data: Partial<ResourceCreateReq>) =>
  put<void>(`/v1/resources/${id}`, data)

export const deleteResource = (id: string) =>
  del<void>(`/v1/resources/${id}`)

export const submitResourceForAudit = (id: string) =>
  post<void>(`/v1/resources/${id}/submit`)

export const auditResource = (id: string, data: { auditResult: number; auditRemark?: string }) =>
  post<void>(`/v1/resources/${id}/audit`, data)

export const getPendingResources = (params?: PageQuery) =>
  get<PageResponse<ResourceItem>>('/v1/resources/pending', params)

export const getResourceAuditLogs = (id: string) =>
  get<AuditLog[]>(`/v1/resources/${id}/audit-logs`)

export const offlineResource = (id: string) =>
  post<void>(`/v1/resources/${id}/offline`)

// ===================== 分类 =====================

export const getCategoryTree = () =>
  get<CategoryNode[]>('/v1/categories/tree')

export const createCategory = (data: { categoryName: string; parentId?: string; sortOrder?: number }) =>
  post<string>('/v1/categories', data)

export const deleteCategory = (id: string) =>
  del<void>(`/v1/categories/${id}`)

// ===================== 标签 =====================

export const getEnabledTags = () =>
  get<TagItem[]>('/v1/tags/enabled')

export const getTagList = (params?: PageQuery & { tagName?: string; categoryId?: string; status?: number }) =>
  get<PageResponse<TagItem>>('/v1/tags', params)

export const createTag = (data: { tagName: string; categoryId?: string; description?: string }) =>
  post<string>('/v1/tags', data)

export const deleteTag = (tagId: string) =>
  del<void>(`/v1/tags/${tagId}`)

// ===================== 文件上传 =====================

export const uploadResourceImage = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return upload<{ fileUrl: string; fileName: string; fileSize: number }>('/v1/upload/image', form)
}

export const uploadResourceVideo = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return upload<{ fileUrl: string; fileName: string; fileSize: number }>('/v1/upload/video', form)
}

export const uploadResourcePdf = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return upload<{ fileUrl: string; fileName: string; fileSize: number }>('/v1/upload/pdf', form)
}
