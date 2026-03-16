/**
 * 报告 & 画像服务 API
 * 后端路由前缀：/api/v1
 */
import { get, post, put, silentGet } from '@/utils/request'
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

export interface DimensionData {
  name: string
  score: number
  maxScore: number
}

export interface RadarDataResponse {
  userId: string
  courseId: string
  dimensions: DimensionData[]
  totalScore: number
  level: string
  growthTrend: string
  updatedTime: string
}

export interface TrackPoint {
  date: string
  totalScore: number
  dimension1Score: number
  dimension2Score: number
  dimension3Score: number
  dimension4Score: number
  dimension5Score: number
  dimension6Score: number
}

export interface GrowthTrackResponse {
  userId: string
  courseId: string
  trackData: TrackPoint[]
  improvement?: number
  trend?: string
}

export interface StatisticsResponse {
  totalWatchDuration: number    // 总观看时长（秒）
  totalPosts: number
  totalAnswers: number
  completedCourseware: number
  totalCourseware: number
}

export interface ReportDTO {
  id: string | number
  courseId: string | number
  reportTitle: string        // 报告标题
  fileUrl?: string           // 文件 URL（有则可直接下载）
  reportType: number         // 1=课程报告 2=学校报告
  generatorId: string | number
  generatorName: string
  generateTime?: string      // 生成完成时间
  downloadCount: number
  createdTime?: string       // 创建时间（兼容）
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
  behaviorObjectId?: string
  durationSeconds?: number
  behaviorData?: string
}

// ===================== 行为埋点 =====================

export const logBehavior = (data: BehaviorLogReq) =>
  post<void>('/v1/behaviors/log', data)

// ===================== 素养画像（静默模式，无数据时不弹窗）=====================

export const getMyProfile = (courseId: string) =>
  silentGet<ProfileResponse>('/v1/profiles/my', { courseId })

export const getUserProfile = (userId: string, courseId: string) =>
  silentGet<ProfileResponse>(`/v1/profiles/${userId}`, { courseId })

export const getProfileList = (params: PageQuery & { courseId?: string }) =>
  get<PageResponse<ProfileResponse>>('/v1/profiles', params)

export const getRadarData = (courseId: string) =>
  silentGet<RadarDataResponse>('/v1/profiles/radar', { courseId })

export const getGrowthTrack = (courseId: string, days = 30) =>
  silentGet<GrowthTrackResponse>('/v1/profiles/growth-track', { courseId, days })

export const getLearningStatistics = (courseId: string, days = 30) =>
  silentGet<StatisticsResponse>('/v1/profiles/statistics', { courseId, days })

export const calculateMyProfile = (courseId: string) =>
  post<void>('/v1/profiles/calculate/user', null, { params: { courseId } })

export const recalculateAllProfiles = (courseId: string | number) =>
  post<void>('/v1/profiles/calculate', null, { params: { courseId } })

// ===================== 报告管理 =====================

export const generateCourseReport = (courseId: string) =>
  post<string>(`/v1/reports/course/${courseId}/generate`)

export const getReportStatus = (reportId: string) =>
  silentGet<ReportStatusResponse>(`/v1/reports/${reportId}/status`)

export const getReportDownloadUrl = (reportId: string) =>
  get<string>(`/v1/reports/${reportId}/download`)

export const getCourseReportList = (courseId: string, params?: PageQuery) =>
  silentGet<PageResponse<ReportDTO>>(`/v1/reports/course/${courseId}`, params)

export const getAllReportList = (params?: PageQuery & { courseId?: string; reportType?: number; startTime?: string; endTime?: string }) =>
  silentGet<PageResponse<ReportDTO>>('/v1/reports', params)

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

export const getScoreConfig = () =>
  get<Record<string, number>>('/v1/admin/config/score-config')

export const updateScoreConfig = (data: Record<string, number>) =>
  put<void>('/v1/admin/config/score-config', data)

export const getTagWeights = () =>
  get<Record<string, any>>('/v1/admin/config/tag-weights')

export const updateTagWeights = (data: Record<string, any>) =>
  put<void>('/v1/admin/config/tag-weights', { tagConfigs: data })

export const getBehaviorWeights = () =>
  get<Record<string, number>>('/v1/admin/config/behavior-weights')

export const updateBehaviorWeights = (data: Record<string, number>) =>
  put<void>('/v1/admin/config/behavior-weights', data)

export const refreshConfigCache = (configKey: string) =>
  post<void>('/v1/admin/config/refresh', null, { params: { configKey } })
