import { defineStore } from 'pinia'
import type { CurrentUser, LoginRequest } from '@/types/user'
import type { UserRole } from '@/types/user'
import { post, get } from '@/utils/request'
import type { LoginResponse } from '@/types/user'

interface AuthState {
  token: string | null
  userInfo: CurrentUser | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    userInfo: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    roles: (state): UserRole[] => state.userInfo?.roles ?? [],
    isAdmin: (state) => state.userInfo?.roles?.includes('ADMIN') ?? false,
    isSchoolLeader: (state) => state.userInfo?.roles?.includes('SCHOOL_LEADER') ?? false,
    /** 教师判断：含 TEACHER、ASSISTANT、SCHOOL_LEADER（校领导同享教师级功能） */
    isTeacher: (state) =>
      !!(state.userInfo?.roles?.includes('TEACHER') ||
        state.userInfo?.roles?.includes('ASSISTANT') ||
        state.userInfo?.roles?.includes('SCHOOL_LEADER')),
    isStudent: (state) => state.userInfo?.roles?.includes('STUDENT') ?? false,
    hasSchool: (state) => !!state.userInfo?.schoolId,
  },

  actions: {
    /** 账号密码登录 */
    async login(data: LoginRequest): Promise<void> {
      const res = await post<LoginResponse>('/v1/auth/login', data)
      this.token = res.token
      // 后端返回结构：{ token, userInfo: { userId, username, realName, avatar, roles } }
      const u = res.userInfo
      this.userInfo = {
        userId: String(u.userId),
        username: u.username,
        realName: u.realName,
        avatar: u.avatar,
        phone: '',
        email: '',
        roles: u.roles ?? [],
        schoolId: u.schoolId ?? null,
        schoolName: u.schoolName ?? null,
        status: 1,
      }
    },

    /** 获取当前用户最新信息 */
    async fetchCurrentUser(): Promise<void> {
      const res = await get<CurrentUser>('/v1/auth/current-user')
      if (res.schools?.[0]) {
        res.schoolId = res.schools[0].schoolId
        res.schoolName = res.schools[0].schoolName
      }
      this.userInfo = res
    },

    /** 退出登录 */
    logout(): void {
      this.token = null
      this.userInfo = null
    },

    /** 判断是否具有某角色 */
    hasRole(role: UserRole): boolean {
      return this.userInfo?.roles?.includes(role) ?? false
    },

    /** 判断是否具有任意一个角色 */
    hasAnyRole(roles: UserRole[]): boolean {
      return roles.some((r) => this.userInfo?.roles?.includes(r))
    },
  },

  persist: {
    key: 'edu-auth',
    storage: localStorage,
    pick: ['token', 'userInfo'],
  },
})
