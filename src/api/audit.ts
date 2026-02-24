import { get, post } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

/** 审核列表查询参数 */
export interface AuditQuery extends PageQuery {
  status?: string
  contentType?: string
}

/** 获取待审核列表 */
export const getAuditList = (params?: AuditQuery) =>
  get<PageResponse<Record<string, unknown>>>('/v1/audits', params)

/** 获取审核详情 */
export const getAuditDetail = (auditId: string) =>
  get<Record<string, unknown>>(`/v1/audits/${auditId}`)

/** 审核通过 */
export const approveAudit = (auditId: string, data?: { comment?: string }) =>
  post<void>(`/v1/audits/${auditId}/approve`, data)

/** 审核拒绝 */
export const rejectAudit = (auditId: string, data: { comment: string }) =>
  post<void>(`/v1/audits/${auditId}/reject`, data)
