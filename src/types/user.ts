import type { PageQuery } from './api'

/** 用户角色 */
export type UserRole = 'ADMIN' | 'SCHOOL_LEADER' | 'TEACHER' | 'ASSISTANT' | 'STUDENT'

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
}

/** 手机号密码登录请求 */
export interface PhonePasswordLoginRequest {
  phone: string
  password: string
}

/** 手机号验证码登录请求 */
export interface PhoneCodeLoginRequest {
  phone: string
  code: string
}

/** 发送验证码请求 */
export interface SendCodeRequest {
  phone: string
}

/** 登录响应 - 后端实际结构 */
export interface LoginResponse {
  token: string
  userInfo: {
    userId: string
    username: string
    realName: string
    avatar: string
    roles: UserRole[]
    phone: string
    email: string
    schoolId?: string | number | null
    schoolName?: string | null
  }
}

/** 用户学校信息 */
export interface UserSchoolInfo {
  schoolId: string | number
  schoolName: string
  memberType: number
}

/** 当前用户信息 */
export interface CurrentUser {
  userId: string
  username: string
  realName: string
  avatar: string
  phone: string
  email: string
  roles: UserRole[]
  schoolId: string | number | null
  schoolName: string | null
  status: number
  schools?: UserSchoolInfo[]
}

/** 修改个人信息请求 */
export interface UpdateProfileRequest {
  realName?: string
  avatar?: string
  email?: string
  phone?: string
}

/** 修改密码请求 */
export interface UpdatePasswordRequest {
  oldPassword: string
  newPassword: string
}

/** 用户管理列表项 */
export interface UserManageItem {
  userId: string
  username: string
  realName: string
  phone: string
  email: string
  avatar: string
  roles: UserRole[]
  status: number
  schoolId: string | null
  schoolName: string | null
  createdAt: string
}

/** 用户管理查询参数 */
export interface UserManageQuery extends PageQuery {
  username?: string
  realName?: string
  phone?: string
  email?: string
  roleId?: string
  status?: number
}

/** 注册请求 */
export interface RegisterRequest {
  username: string
  password: string
  phone?: string
  email?: string
}
