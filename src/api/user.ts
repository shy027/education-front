import { get, post, put, upload } from '@/utils/request'
import type { UserManageItem, UserManageQuery } from '@/types/user'
import type { PageResponse } from '@/types/api'

/** 用户列表（分页） */
export const getUserList = (params: UserManageQuery) =>
  get<PageResponse<UserManageItem>>('/v1/users/manage', params)

/** 用户详情 */
export const getUserDetail = (userId: string) =>
  get<UserManageItem>(`/v1/users/manage/${userId}`)

/** 更新用户状态 */
export const updateUserStatus = (userId: string, status: number) =>
  put<void>(`/v1/users/manage/${userId}/status`, { status })

/** 重置用户密码 */
export const resetUserPassword = (userId: string) =>
  post<{ newPassword: string; message: string }>(`/v1/users/manage/${userId}/reset-password`)

/** 批量导入用户 */
export const importUsers = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return upload<{ successCount: number; failCount: number; failDetails: string[] }>(
    '/v1/users/manage/import',
    form,
  )
}

/** 批量获取用户信息 */
export const batchGetUsers = (userIds: string[]) =>
  post<Record<string, UserManageItem>>('/v1/users/manage/batch', userIds)

/** 上传头像 */
export const uploadAvatar = (file: File, userId: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('userId', userId)
  return upload<{ url: string }>('/v1/files/avatar', form)
}

/** 上传文件 */
export const uploadFile = (file: File, folder = 'temp') => {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  return upload<{ url: string }>('/v1/files/upload', form)
}

/** 获取所有角色 */
export const getAllRoles = () =>
  get<{ id: string; roleName: string; roleCode: string }[]>('/v1/roles/all')
