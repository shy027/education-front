/**
 * 学校服务 API
 * 后端路由前缀：/api/v1/schools
 */
import { get, post } from '@/utils/request'


// ===================== 类型定义 =====================

export interface SchoolItem {
  schoolId: number | string   // 后端 Long，序列化为数字
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
}

export interface JoinSchoolRequest {
  inviteCode?: string
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
