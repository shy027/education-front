import request from '@/utils/request'
import type { PageQuery, PageResponse as PageResult } from '@/types/api'

export interface SubjectCategory {
  id: string
  name: string
  sortOrder: number
  isEnabled: number
  createdTime: string
  updatedTime: string
}

export interface SubjectCategoryReq {
  name: string
  sortOrder: number
}

/** 获取所有启用的学科分类（所有人可用） */
export function getAllEnabledSubjects() {
  return request.get<SubjectCategory[]>('/v1/subjects')
}

/** 分页获取学科分类列表（管理员） */
export function getSubjectPage(params?: PageQuery & { keyword?: string }) {
  return request.get<PageResult<SubjectCategory>>('/v1/subjects/admin', { params })
}

/** 新增学科分类（管理员） */
export function createSubject(data: SubjectCategoryReq) {
  return request.post<void>('/v1/subjects', data)
}

/** 更新学科分类（管理员） */
export function updateSubject(id: string, data: SubjectCategoryReq) {
  return request.put<void>(`/v1/subjects/${id}`, data)
}

/** 删除学科分类（管理员） */
export function deleteSubject(id: string) {
  return request.delete<void>(`/v1/subjects/${id}`)
}

/** 更新学科分类状态（管理员） */
export function updateSubjectStatus(id: string, isEnabled: number) {
  return request.put<void>(`/v1/subjects/${id}/status`, null, {
    params: { isEnabled }
  })
}
