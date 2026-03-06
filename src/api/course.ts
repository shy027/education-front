/**
 * 课程服务 API
 * 后端路由前缀：/api/v1
 */
import { get, post, put, del, upload } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

// ===================== 类型定义 =====================

export interface CourseCreateReq {
  courseName: string
  description?: string
  cover?: string
  subjectArea?: string
  joinType: number        // 0=公开 1=审批 2=邀请码
  inviteCode?: string
  schoolId?: string
}

export interface CourseItem {
  id: string
  courseName: string
  description: string
  cover: string
  courseCover?: string
  status: number          // 0=草稿 1=进行中 2=已结课
  joinType: number
  teacherId: string
  teacherName: string
  memberCount: number
  studentCount?: number
  subjectArea: string
  auditStatus: number
  createdTime: string
  endTime?: string        // 结束时间，为空表示永不结束
}

export interface CourseQuery extends PageQuery {
  keyword?: string
  schoolId?: string
  subjectArea?: string
  joinType?: number
  status?: number
  auditStatus?: number
  teacherId?: string
}

/** 我的课程响应 - 后端实际字段名 */
export interface MyCourseItem {
  courseId: string
  courseCode?: string
  courseName: string
  courseCover?: string
  courseIntro?: string
  subjectArea?: string
  myRole?: number
  studentCount?: number
  status: number
  endTime?: string
  // 以下为兼容旧字段（若后端同时返回）
  id?: string
  cover?: string
  teacherId?: string
  teacherName?: string
  memberCount?: number
  createdTime?: string
}

export interface MyCoursesResponse {
  teaching: MyCourseItem[]     // 我教的课程
  learning: MyCourseItem[]     // 我学的课程
  assisting: MyCourseItem[]    // 我协助的课程（助教）
}

export interface ChapterNode {
  id: string
  title: string
  sortOrder: number
  children: ChapterNode[]
}

export interface CoursewareItem {
  id: string
  title: string
  wareType: number        // 1=视频 2=文档 3=PPT 4=音频
  fileUrl: string
  coverUrl?: string
  chapterId?: string
  duration?: number
  sortOrder: number
  auditStatus: number
  progress?: number       // 学习进度（百分比）
}

export interface TaskItem {
  id: string
  taskName: string
  taskType: number        // 1=作业 2=考试 3=讨论
  description?: string
  startTime?: string
  endTime?: string
  totalScore?: number
  duration?: number
  status: number          // 0=草稿 1=发布 2=结束
  submitCount: number
}

export interface AnnouncementItem {
  id: string
  title: string
  content: string
  isTop: number
  createdTime: string
  updatedTime: string
}

export interface MemberItem {
  userId: string
  username: string
  realName: string
  avatar?: string
  memberRole: number      // 1=教师 2=助教 3=学生
  joinStatus: number      // 0=待审批 1=已通过 2=已拒绝
  joinedTime: string
}

export interface FileUploadResult {
  fileUrl: string
  fileSize?: number
  duration?: number
}

// ===================== 课程 CRUD =====================

export const getCourseList = (params: CourseQuery) =>
  get<PageResponse<CourseItem>>('/v1/courses', params)

export const getCourseDetail = (id: string) =>
  get<CourseItem>(`/v1/courses/${id}`)

export const createCourse = (data: CourseCreateReq) =>
  post<string>('/v1/courses', data)

export const updateCourse = (data: CourseCreateReq & { id: string }) =>
  put<void>('/v1/courses', data)

export const updateCourseStatus = (id: string, status: number) =>
  put<void>(`/v1/courses/${id}/status`, null, { params: { status } })

export const getMyCourses = () =>
  get<MyCoursesResponse>('/v1/courses/my-courses')

// ===================== 章节 =====================

export const getChapterTree = (courseId: string) =>
  get<ChapterNode[]>(`/v1/courses/${courseId}/chapters/tree`)

export const createChapter = (courseId: string, data: { title: string; parentId?: string; sortOrder?: number }) =>
  post<string>(`/v1/courses/${courseId}/chapters`, data)

export const deleteChapter = (courseId: string, id: string) =>
  del<void>(`/v1/courses/${courseId}/chapters/${id}`)

// ===================== 课件 =====================

export const getCoursewareList = (courseId: string, params?: PageQuery & { chapterId?: string; wareType?: number }) =>
  get<PageResponse<CoursewareItem>>(`/v1/courses/${courseId}/coursewares`, params)

export const getCoursewareDetail = (wareId: string) =>
  get<CoursewareItem>(`/v1/coursewares/${wareId}`)

export const createCourseware = (courseId: string, data: Record<string, unknown>) =>
  post<string>(`/v1/courses/${courseId}/coursewares`, data)

export const deleteCourseware = (wareId: string) =>
  del<void>(`/v1/coursewares/${wareId}`)

/** 记录学习进度 */
export const recordProgress = (wareId: string, data: { watchedDuration: number; totalDuration: number; isFinished?: boolean }) =>
  post<void>(`/v1/coursewares/${wareId}/progress`, data)

/** 上传课件文件 */
export const uploadCoursewareFile = (type: 'video' | 'pdf' | 'audio' | 'ppt' | 'cover', file: File) => {
  const form = new FormData()
  form.append('file', file)
  return upload<FileUploadResult>(`/v1/courseware/files/${type}`, form)
}

// ===================== 任务 =====================

export const getTaskList = (courseId: string, params?: PageQuery) =>
  get<PageResponse<TaskItem>>(`/v1/courses/${courseId}/tasks`, params)

export const getTaskDetail = (courseId: string, id: string) =>
  get<TaskItem>(`/v1/courses/${courseId}/tasks/${id}`)

export const createTask = (courseId: string, data: Partial<TaskItem>) =>
  post<string>(`/v1/courses/${courseId}/tasks`, data)

export const updateTask = (courseId: string, data: Partial<TaskItem> & { id: string }) =>
  put<void>(`/v1/courses/${courseId}/tasks`, data)

export const deleteTask = (courseId: string, id: string) =>
  del<void>(`/v1/courses/${courseId}/tasks/${id}`)

export const updateTaskStatus = (courseId: string, id: string, status: number) =>
  put<void>(`/v1/courses/${courseId}/tasks/${id}/status`, null, { params: { status } })

// ===================== 成员 =====================

export const getMemberList = (courseId: string, params?: PageQuery & { memberRole?: number; joinStatus?: number }) =>
  get<PageResponse<MemberItem>>(`/v1/courses/${courseId}/members`, params)

export const joinCourse = (courseId: string) =>
  post<void>(`/v1/courses/${courseId}/join`)

export const quitCourse = (courseId: string) =>
  del<void>(`/v1/courses/${courseId}/quit`)

export const approveMember = (courseId: string, userId: string, approve: boolean, reason?: string) =>
  put<void>(`/v1/courses/${courseId}/members/${userId}/approve`, { approve, reason })

export const checkMembership = (courseId: string, userId: string) =>
  get<{ isMember: boolean; memberRole?: number; joinStatus?: number }>(`/v1/courses/${courseId}/members/check`, { userId })

// ===================== 公告 =====================

export const getAnnouncementList = (courseId: string, params?: PageQuery & { keyword?: string; isTop?: number }) =>
  get<PageResponse<AnnouncementItem>>(`/v1/courses/${courseId}/announcements`, params)

export const getAnnouncementDetail = (courseId: string, id: string) =>
  get<AnnouncementItem>(`/v1/courses/${courseId}/announcements/${id}`)

export const createAnnouncement = (courseId: string, data: { title: string; content: string; isTop?: number }) =>
  post<string>(`/v1/courses/${courseId}/announcements`, data)

export const deleteAnnouncement = (courseId: string, id: string) =>
  del<void>(`/v1/courses/${courseId}/announcements/${id}`)

export const toggleAnnouncementTop = (courseId: string, id: string, isTop: number) =>
  put<void>(`/v1/courses/${courseId}/announcements/${id}/top`, null, { params: { isTop } })

// ===================== 考试（学生端） =====================

export const getStudentExamList = (params?: PageQuery & { courseId?: string; status?: number }) =>
  get<PageResponse<TaskItem>>('/v1/student/exams', params)

export const getExamDetail = (taskId: string) =>
  get<Record<string, unknown>>(`/v1/student/exams/${taskId}`)

export const startExam = (taskId: string) =>
  post<{ recordId: string }>(`/v1/student/exams/${taskId}/start`)

export const saveAnswer = (data: { recordId: string; questionId: string; answer: string }) =>
  post<void>('/v1/student/answers/save', data)

export const submitExam = (recordId: string) =>
  post<void>(`/v1/student/answers/${recordId}/submit`)

// ===================== 批改（教师端） =====================

export const getGradingPending = (taskId: string, params?: PageQuery) =>
  get<PageResponse<Record<string, unknown>>>('/v1/grading/pending', { taskId, ...params })

export const gradeAnswer = (data: { answerId: string; score: number; comment?: string }) =>
  post<void>('/v1/grading/grade', data)

export const publishGrades = (recordId: string) =>
  post<void>(`/v1/grading/${recordId}/publish`)
