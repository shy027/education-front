import { get, post, put } from '@/utils/request'
import type {
  LoginRequest,
  LoginResponse,
  CurrentUser,
  UpdateProfileRequest,
  UpdatePasswordRequest,
  RegisterRequest,
} from '@/types/user'

/** 用户注册 */
export const register = (data: RegisterRequest) =>
  post<{ userId: string; username: string }>('/v1/auth/register', data)

/** 账号密码登录 */
export const login = (data: LoginRequest) =>
  post<LoginResponse>('/v1/auth/login', data)

/** 手机号+密码登录 */
export const phonePasswordLogin = (data: { phone: string; password: string }) =>
  post<LoginResponse>('/v1/auth/phone-password-login', data)

/** 手机号+验证码登录 */
export const phoneCodeLogin = (data: { phone: string; code: string }) =>
  post<LoginResponse>('/v1/auth/phone-code-login', data)

/** 发送短信验证码 */
export const sendCode = (phone: string) =>
  post<{ message: string; code?: string }>('/v1/auth/send-code', { phone })

/** 获取当前用户信息 */
export const getCurrentUser = () =>
  get<CurrentUser>('/v1/auth/current-user')

/** 修改个人信息 */
export const updateProfile = (data: UpdateProfileRequest) =>
  put<void>('/v1/auth/profile', data)

/** 修改密码 */
export const updatePassword = (data: UpdatePasswordRequest) =>
  put<void>('/v1/auth/password', data)
