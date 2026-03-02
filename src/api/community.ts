/**
 * 社区服务 API
 * 后端路由前缀：/api/v1/community
 */
import { get, post, put, del } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

// ===================== 类型定义 =====================

export interface PostItem {
  id: string
  courseId: string
  title: string
  content?: string
  authorId: string
  authorName: string
  authorAvatar?: string
  likeCount: number
  commentCount: number
  isTop: number
  isEssence: number
  createdTime: string
}

export interface CommentItem {
  id: string
  postId: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  parentId?: string
  likeCount: number
  liked?: boolean
  children: CommentItem[]
  createdTime: string
}

export interface GroupItem {
  id: string
  courseId: string
  groupName: string
  description?: string
  maxMembers?: number
  status: number          // 0=招募中 1=进行中 2=已解散
  memberCount: number
  creatorId: string
  creatorName: string
  createdTime: string
}

export interface GroupMember {
  id: string
  userId: string
  username: string
  realName?: string
  avatar?: string
  joinTime: string
}

export interface DocumentItem {
  id: string
  groupId: string
  title: string
  content?: string
  creatorId: string
  lastEditorId?: string
  lastEditorName?: string
  createdTime: string
  updatedTime: string
}

// ===================== 讨论话题（Post）=====================

export const getPostList = (params: PageQuery & { courseId: string; keyword?: string; isTop?: number; isEssence?: number }) =>
  get<PageResponse<PostItem>>('/v1/community/posts', params)

export const getMyPosts = (params?: PageQuery) =>
  get<PageResponse<PostItem>>('/v1/community/posts/my', params)

export const getPostDetail = (postId: string) =>
  get<PostItem>(`/v1/community/posts/${postId}`)

export const createPost = (data: { courseId: string; title: string; content?: string }) =>
  post<PostItem>('/v1/community/posts', data)

export const updatePost = (postId: string, data: { title?: string; content?: string }) =>
  put<void>(`/v1/community/posts/${postId}`, data)

export const deletePost = (postId: string) =>
  del<void>(`/v1/community/posts/${postId}`)

export const togglePostTop = (postId: string, isTop: number) =>
  put<void>(`/v1/community/posts/${postId}/top`, null, { params: { isTop } })

export const togglePostEssence = (postId: string, isEssence: number) =>
  put<void>(`/v1/community/posts/${postId}/essence`, null, { params: { isEssence } })

// ===================== 观点/评论（Comment）=====================

export const getCommentList = (params: PageQuery & { postId: string; parentId?: string }) =>
  get<PageResponse<CommentItem>>('/v1/community/comments', params)

export const createComment = (data: { postId: string; content: string; parentId?: string }) =>
  post<CommentItem>('/v1/community/comments', data)

export const deleteComment = (commentId: string) =>
  del<void>(`/v1/community/comments/${commentId}`)

// ===================== 点赞（Like）=====================

export const togglePostLike = (postId: string) =>
  post<{ liked: boolean; likeCount: number }>(`/v1/community/likes/posts/${postId}`)

export const toggleCommentLike = (commentId: string) =>
  post<{ liked: boolean; likeCount: number }>(`/v1/community/likes/comments/${commentId}`)

// ===================== 小组（Group）=====================

export const getGroupList = (params: PageQuery & { courseId: string; status?: number }) =>
  get<PageResponse<GroupItem>>('/v1/community/groups', params)

export const getGroupDetail = (groupId: string) =>
  get<GroupItem>(`/v1/community/groups/${groupId}`)

export const createGroup = (data: { courseId: string; groupName: string; description?: string; maxMembers?: number }) =>
  post<string>('/v1/community/groups', data)

export const updateGroup = (groupId: string, data: { groupName?: string; description?: string; maxMembers?: number }) =>
  put<void>(`/v1/community/groups/${groupId}`, data)

export const deleteGroup = (groupId: string) =>
  del<void>(`/v1/community/groups/${groupId}`)

export const applyGroup = (groupId: string) =>
  post<void>(`/v1/community/groups/${groupId}/apply`)

export const quitGroup = (groupId: string) =>
  del<void>(`/v1/community/groups/${groupId}/quit`)

export const getGroupMembers = (groupId: string, params?: PageQuery) =>
  get<PageResponse<GroupMember>>(`/v1/community/groups/${groupId}/members`, params)

export const approveGroupMember = (groupId: string, memberId: string, approveStatus: number) =>
  put<void>(`/v1/community/groups/${groupId}/members/${memberId}/approve`, { approveStatus })

// ===================== 协作文档（GroupDocument）=====================

export const getDocumentList = (groupId: string, params?: PageQuery) =>
  get<PageResponse<DocumentItem>>(`/v1/community/groups/${groupId}/documents`, params)

export const getDocumentDetail = (groupId: string, documentId: string) =>
  get<DocumentItem>(`/v1/community/groups/${groupId}/documents/${documentId}`)

export const createDocument = (groupId: string, data: { title: string; content?: string }) =>
  post<string>(`/v1/community/groups/${groupId}/documents`, data)

export const updateDocument = (groupId: string, documentId: string, data: { content: string; editSummary?: string }) =>
  put<void>(`/v1/community/groups/${groupId}/documents/${documentId}`, data)

export const deleteDocument = (groupId: string, documentId: string) =>
  del<void>(`/v1/community/groups/${groupId}/documents/${documentId}`)

export const getDocumentHistory = (groupId: string, documentId: string, params?: PageQuery) =>
  get<PageResponse<Record<string, unknown>>>(`/v1/community/groups/${groupId}/documents/${documentId}/history`, params)
