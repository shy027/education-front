import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/user'

/** 权限判断 hook */
export function usePermission() {
  const authStore = useAuthStore()

  const hasRole = (role: UserRole) => computed(() => authStore.hasRole(role))

  const hasAnyRole = (roles: UserRole[]) =>
    computed(() => authStore.hasAnyRole(roles))

  const isAdmin = computed(() => authStore.isAdmin)
  const isTeacher = computed(() => authStore.isTeacher)
  const isStudent = computed(() => authStore.isStudent)
  const isSchoolLeader = computed(() => authStore.isSchoolLeader)

  return { hasRole, hasAnyRole, isAdmin, isTeacher, isStudent, isSchoolLeader }
}
