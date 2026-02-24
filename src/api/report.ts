import { get, post } from '@/utils/request'

/** 获取学生素养画像（雷达图数据） */
export const getStudentProfile = (studentId?: string) =>
  get<Record<string, unknown>>('/v1/reports/profile', studentId ? { studentId } : undefined)

/** 获取成长轨迹 */
export const getGrowthTrajectory = (params?: { courseId?: string }) =>
  get<Record<string, unknown>[]>('/v1/reports/trajectory', params)

/** 上报行为埋点 */
export const trackBehavior = (data: {
  behaviorType: string
  targetId?: string
  targetType?: string
  duration?: number
  extra?: Record<string, unknown>
}) => post<void>('/v1/reports/behavior', data)

/** 生成课程报告 */
export const generateCourseReport = (courseId: string) =>
  post<{ reportId: string }>('/v1/reports/course', { courseId })

/** 生成学校报告（校领导/管理员） */
export const generateSchoolReport = (schoolId: string) =>
  post<{ reportId: string }>('/v1/reports/school', { schoolId })

/** 获取报告列表 */
export const getReportList = (params?: Record<string, unknown>) =>
  get<Record<string, unknown>[]>('/v1/reports', params)

/** 下载报告（返回 blob URL） */
export const downloadReport = (reportId: string) =>
  get<Blob>(`/v1/reports/${reportId}/download`, undefined, { responseType: 'blob' })
