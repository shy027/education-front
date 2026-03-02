/**
 * 报告 & 画像服务 API
 * 后端路由前缀：/api/v1
 */
import { get, post, put } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

// ===================== 类型定义 =====================

export interface ProfileResponse {
  userId: string
  courseId: string
  theoreticalLiteracy: number   // 理论素养
  practicalAbility: number       // 实践能力
  valueIdentity: number          // 价值认同
  innovativeThinking: number     // 创新思维
  socialResponsibility: number   // 社会责任感
  totalScore: number
  level: string                  // 优秀/良好/合格/待提升
  updatedTime: string
}

export interface RadarDataResponse {
  dimensions: string[]
  scores: number[]
  classAvg: number[]
}

export interface GrowthTrackResponse {
  dates: string[]
  totalScores: number[]
}

export interface StatisticsResponse {
  totalWatchDuration: number    // 总观看时长（秒）
  totalPosts: number
  totalAnswers: number
  completedCourseware: number
  totalCourseware: number
}

export interface ReportDTO {
  id: string
  courseId: string
  courseName: string
  reportType: number            // 1=课程报告 2=学校报告
  status: number                // 0=等待 1=生成中 2=完成 3=失败
  generatorId: string
  generatorName: string
  createdTime: string
  finishedTime?: string
  downloadCount: number
}

export interface ReportStatusResponse {
  reportId: string
  status: number
  statusDesc: string
  progress: number
  createdTime: string
  finishedTime?: string
}

export interface BehaviorLogReq {
  userId: string
  courseId: string
  behaviorType: 'WATCH_VIDEO' | 'READ_DOC' | 'POST_COMMENT' | 'SUBMIT_ANSWER' | 'GROUP_DISCUSS' | 'RESOURCE_VIEW'
  targetId?: string
  duration?: number
  extra?: string
}

// ===================== 行为埋点 =====================

export const logBehavior = (data: BehaviorLogReq) =>
  post<void>('/v1/behaviors/log', data)

// ===================== 素养画像 =====================

export const getMyProfile = (courseId: string) =>
  get<ProfileResponse>('/v1/profiles/my', { courseId })

export const getUserProfile = (userId: string, courseId: string) =>
  get<ProfileResponse>(`/v1/profiles/${userId}`, { courseId })

export const getRadarData = (courseId: string) =>
  get<RadarDataResponse>('/v1/profiles/radar', { courseId })

export const getGrowthTrack = (courseId: string, days = 30) =>
  get<GrowthTrackResponse>('/v1/profiles/growth-track', { courseId, days })

export const getLearningStatistics = (courseId: string, days = 30) =>
  get<StatisticsResponse>('/v1/profiles/statistics', { courseId, days })

export const calculateMyProfile = (courseId: string) =>
  post<void>('/v1/profiles/calculate/user', null, { params: { courseId } })

// ===================== 报告管理 =====================

export const generateCourseReport = (courseId: string) =>
  post<string>(`/v1/reports/course/${courseId}/generate`)

export const getReportStatus = (reportId: string) =>
  get<ReportStatusResponse>(`/v1/reports/${reportId}/status`)

export const getReportDownloadUrl = (reportId: string) =>
  get<string>(`/v1/reports/${reportId}/download`)

export const getCourseReportList = (courseId: string, params?: PageQuery) =>
  get<PageResponse<ReportDTO>>(`/v1/reports/course/${courseId}`, params)

export const getAllReportList = (params?: PageQuery & { courseId?: string; reportType?: number; startTime?: string; endTime?: string }) =>
  get<PageResponse<ReportDTO>>('/v1/reports', params)

export const deleteReport = (reportId: string) =>
  import('@/utils/request').then(m => m.del<void>(`/v1/reports/${reportId}`))

// ===================== 管理员配置 =====================

export const getWeightsConfig = () =>
  get<Record<string, number>>('/v1/admin/config/weights')

export const updateWeightsConfig = (data: Record<string, number>) =>
  put<void>('/v1/admin/config/weights', data)

export const getThresholdsConfig = () =>
  get<{ excellent: number; good: number; pass: number }>('/v1/admin/config/thresholds')

export const updateThresholdsConfig = (data: { excellent: number; good: number; pass: number }) =>
  put<void>('/v1/admin/config/thresholds', data)
