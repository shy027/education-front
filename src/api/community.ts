import { get, post, put, del } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

/** 获取讨论话题列表 */
export const getTopics = (params?: PageQuery & { keyword?: string; courseId?: string }) =>
  get<PageResponse<Record<string, unknown>>>('/v1/topics', params)

/** 获取话题详情 */
export const getTopicDetail = (topicId: string) =>
  get<Record<string, unknown>>(`/v1/topics/${topicId}`)

/** 创建话题 */
export const createTopic = (data: Record<string, unknown>) =>
  post<{ topicId: string }>('/v1/topics', data)

/** 删除话题 */
export const deleteTopic = (topicId: string) =>
  del<void>(`/v1/topics/${topicId}`)

/** 点赞/取消点赞话题 */
export const toggleTopicLike = (topicId: string) =>
  post<void>(`/v1/topics/${topicId}/like`)

/** 获取话题评论 */
export const getTopicComments = (topicId: string, params?: PageQuery) =>
  get<PageResponse<Record<string, unknown>>>(`/v1/topics/${topicId}/comments`, params)

/** 发表评论 */
export const createComment = (topicId: string, data: Record<string, unknown>) =>
  post<{ commentId: string }>(`/v1/topics/${topicId}/comments`, data)

/** 删除评论 */
export const deleteComment = (topicId: string, commentId: string) =>
  del<void>(`/v1/topics/${topicId}/comments/${commentId}`)

/** 获取小组列表 */
export const getGroups = (params?: PageQuery & { courseId?: string }) =>
  get<PageResponse<Record<string, unknown>>>('/v1/groups', params)

/** 获取小组详情 */
export const getGroupDetail = (groupId: string) =>
  get<Record<string, unknown>>(`/v1/groups/${groupId}`)

/** 创建小组 */
export const createGroup = (data: Record<string, unknown>) =>
  post<{ groupId: string }>('/v1/groups', data)

/** 获取小组协作文档 */
export const getGroupDoc = (groupId: string) =>
  get<Record<string, unknown>>(`/v1/groups/${groupId}/doc`)

/** 保存协作文档 */
export const saveGroupDoc = (groupId: string, data: { content: string }) =>
  put<void>(`/v1/groups/${groupId}/doc`, data)
