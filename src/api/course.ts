import { get, post, put, del } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

/** 课程列表查询参数 */
export interface CourseQuery extends PageQuery {
  keyword?: string
  status?: string
  accessType?: string
  schoolId?: string
  categoryId?: string
}

/** 课程简要信息 */
export interface CourseBrief {
  courseId: string
  title: string
  description: string
  coverImage: string
  teacherName: string
  schoolName: string
  status: string
  accessType: string
  memberCount: number
  createdAt: string
}

/** 获取课程列表（学生/公开） */
export const getCourseList = (params: CourseQuery) =>
  get<PageResponse<CourseBrief>>('/v1/courses', params)

/** 获取课程详情 */
export const getCourseDetail = (courseId: string) =>
  get<Record<string, unknown>>(`/v1/courses/${courseId}`)

/** 加入课程 */
export const joinCourse = (courseId: string) =>
  post<void>(`/v1/courses/${courseId}/join`)

/** 退出课程 */
export const leaveCourse = (courseId: string) =>
  del<void>(`/v1/courses/${courseId}/leave`)

/** 教师：创建课程 */
export const createCourse = (data: Record<string, unknown>) =>
  post<{ courseId: string }>('/v1/courses', data)

/** 教师：更新课程 */
export const updateCourse = (courseId: string, data: Record<string, unknown>) =>
  put<void>(`/v1/courses/${courseId}`, data)

/** 获取课程章节 */
export const getChapters = (courseId: string) =>
  get<unknown[]>(`/v1/courses/${courseId}/chapters`)

/** 获取课程公告 */
export const getNotices = (courseId: string, params?: PageQuery) =>
  get<PageResponse<Record<string, unknown>>>(`/v1/courses/${courseId}/notices`, params)

/** 获取课程任务列表 */
export const getCourseTasks = (courseId: string, params?: PageQuery) =>
  get<PageResponse<Record<string, unknown>>>(`/v1/courses/${courseId}/tasks`, params)

/** 学生提交任务答案 */
export const submitTaskAnswer = (courseId: string, taskId: string, data: Record<string, unknown>) =>
  post<void>(`/v1/courses/${courseId}/tasks/${taskId}/submit`, data)

/** 获取课程成员列表 */
export const getCourseMembers = (courseId: string, params?: PageQuery) =>
  get<PageResponse<Record<string, unknown>>>(`/v1/courses/${courseId}/members`, params)
