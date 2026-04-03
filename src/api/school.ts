/**
 * 学校服务 API
 * 后端路由前缀：/api/v1/schools
 */
import { get, post, put } from '@/utils/request'


// ===================== 类型定义 =====================

export interface SchoolItem {
  id: number | string   // 后端 Long，与 SchoolResponse.id 匹配
  schoolCode?: string
  schoolName: string
  province?: string
  city?: string
  address?: string
  logoUrl?: string
  description?: string
  teacherCount?: number
  studentCount?: number
  courseCount?: number
  contactPhone?: string
}

export interface JoinSchoolRequest {
  inviteCode?: string
}

export interface SchoolRequest {
  schoolName: string
  schoolCode?: string
  province?: string
  city?: string
  address?: string
  logoUrl?: string
  description?: string
  contactPhone?: string
}

// ===================== API =====================

/** 后端 PageResult 结构（字段是 list，不是 records） */
export interface SchoolPageResult {
  total: number
  list: SchoolItem[]
}

/** 获取学校列表（所有人可访问） */
export const getSchoolList = (params?: { keyword?: string; province?: string; pageNum?: number; pageSize?: number }) =>
  get<SchoolPageResult>('/v1/schools', params)

/** 获取学校详情 */
export const getSchoolDetail = (schoolId: string) =>
  get<SchoolItem>(`/v1/schools/${schoolId}`)

/** 申请加入学校（需登录） */
export const joinSchool = (schoolId: string, data?: JoinSchoolRequest) =>
  post<void>(`/v1/schools/${schoolId}/join`, data ?? {})

/** 获取学校下的院系列表 */
export const getDepartments = (schoolId: string) =>
  get<string[]>(`/v1/schools/${schoolId}/departments`)

/** 获取学院下的班级列表 */
export const getClasses = (schoolId: string, department: string) =>
  get<string[]>(`/v1/schools/${schoolId}/classes`, { department })

/** 更新学校信息 (需管理权限) */
export const updateSchool = (id: string | number, data: SchoolRequest) =>
  put<void>(`/v1/schools/${id}`, data)
