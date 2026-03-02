/**
 * 审核服务 API
 * 后端路由前缀：/api/v1/audit
 * 权限：ADMIN / SCHOOL_LEADER
 */
import { get, put } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

// ===================== 类型定义 =====================

export interface AuditRecord {
  id: string
  contentType: 'COURSEWARE' | 'POST' | 'COMMENT' | 'RESOURCE'
  contentId: string
  contentTitle: string
  contentPreview?: string
  submitterId: string
  submitterName: string
  riskLevel: number             // 1=低 2=中 3=高
  riskReason?: string
  status: number                // 0=待审核 1=通过 2=拒绝
  auditorId?: string
  auditorName?: string
  auditTime?: string
  submittedTime: string
  auditComment?: string
}

export interface AuditPendingQuery extends PageQuery {
  contentType?: 'COURSEWARE' | 'POST' | 'COMMENT' | 'RESOURCE'
  riskLevel?: number
}

export interface AuditHistoryQuery extends PageQuery {
  contentType?: string
  auditResult?: number           // 1=通过 2=拒绝
  startDate?: string
  endDate?: string
}

export interface BatchAuditResult {
  successCount: number
  failCount: number
  failDetails: string[]
}

// ===================== 接口 =====================

/** 查询待审核列表 */
export const getPendingList = (params?: AuditPendingQuery) =>
  get<PageResponse<AuditRecord>>('/v1/audit/pending', params)

/** 人工审核单条记录 */
export const auditRecord = (recordId: string, data: { auditResult: number; auditComment?: string }) =>
  put<void>(`/v1/audit/${recordId}`, data)

/** 批量审核 */
export const batchAudit = (data: { recordIds: string[]; auditResult: number; auditComment?: string }) =>
  put<BatchAuditResult>('/v1/audit/batch', data)

/** 查询审核历史 */
export const getAuditHistory = (params?: AuditHistoryQuery) =>
  get<PageResponse<AuditRecord>>('/v1/audit/records', params)
