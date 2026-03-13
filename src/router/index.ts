import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/user'

// 路由元信息类型扩展
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: UserRole[]      // 允许访问的角色列表，为空则所有角色可访问
    title?: string
    icon?: string
    hideInMenu?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  // === 认证页 ===
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { title: '登录', hideInMenu: true },
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/views/auth/LoginPage.vue'),
      },
    ],
  },

  // === 前台业务（需登录，全用户共用 FrontLayout） ===
  {
    path: '/',
    component: () => import('@/layouts/FrontLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/home',
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/HomePage.vue'),
        meta: { title: '首页', icon: 'House' },
      },

      // 课程
      {
        path: 'course',
        name: 'CourseList',
        component: () => import('@/views/course/CourseListPage.vue'),
        meta: { title: '课程', icon: 'Reading' },
      },
      {
        path: 'course/:id',
        name: 'CourseDetail',
        component: () => import('@/views/course/CourseDetailPage.vue'),
        meta: { title: '课程详情', hideInMenu: true },
      },

      // 研讨社区（依附于具体课程，前台不提供独立入口）
      {
        path: 'community',
        name: 'Community',
        component: () => import('@/views/community/CommunityPage.vue'),
        meta: { title: '研讨社区', hideInMenu: true },
      },
      {
        path: 'community/topic/:id',
        name: 'TopicDetail',
        component: () => import('@/views/community/TopicDetailPage.vue'),
        meta: { title: '话题详情', hideInMenu: true },
      },
      {
        path: 'community/group/:id',
        name: 'GroupDetail',
        component: () => import('@/views/community/GroupDetailPage.vue'),
        meta: { title: '小组详情', hideInMenu: true },
      },

      // 院校中心
      {
        path: 'schools',
        name: 'Schools',
        component: () => import('@/views/school/SchoolsPage.vue'),
        meta: { title: '院校中心', icon: 'OfficeBuilding' },
      },
      {
        path: 'schools/:id',
        name: 'SchoolDetail',
        component: () => import('@/views/school/SchoolDetailPage.vue'),
        meta: { title: '学校详情', hideInMenu: true },
      },

      // 资源库
      {
        path: 'resource',
        name: 'Resource',
        component: () => import('@/views/resource/ResourcePage.vue'),
        meta: { title: '资源库', icon: 'FolderOpened' },
      },
      {
        path: 'resource/create',
        name: 'ResourceCreate',
        component: () => import('@/views/resource/ResourceCreatePage.vue'),
        meta: { title: '发布资源', hideInMenu: true },
      },
      {
        path: 'resource/:id',
        name: 'ResourceDetail',
        component: () => import('@/views/resource/ResourceDetailPage.vue'),
        meta: { title: '资源详情', hideInMenu: true },
      },

      // 报告画像
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/report/ReportPage.vue'),
        meta: { title: '素养报告', icon: 'DataLine' },
      },

      // 个人中心
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/ProfilePage.vue'),
        meta: { title: '个人中心', icon: 'User' },
      },
    ]
  },

  // === 管理后台（仅 ADMIN/SCHOOL_LEADER，使用 MainLayout） ===
  {
    path: '/admin',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: {
      requiresAuth: true,
      title: '管理后台',
      roles: ['ADMIN', 'SCHOOL_LEADER'],
    },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/DashboardPage.vue'),
        meta: { title: '数据看板', icon: 'DataBoard' },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UsersPage.vue'),
        meta: { title: '用户管理', icon: 'UserFilled', roles: ['ADMIN', 'SCHOOL_LEADER'] },
      },
      {
        path: 'schools',
        name: 'AdminSchools',
        component: () => import('@/views/admin/SchoolsPage.vue'),
        meta: { title: '学校管理', icon: 'OfficeBuilding', roles: ['ADMIN'] },
      },
      {
        path: 'audit',
        name: 'AdminAudit',
        component: () => import('@/views/admin/AuditPage.vue'),
        meta: { title: '审核中心', icon: 'CircleCheckFilled', roles: ['ADMIN', 'SCHOOL_LEADER'] },
      },
      {
        path: 'resources',
        name: 'AdminResources',
        component: () => import('@/views/admin/ResourcesPage.vue'),
        meta: { title: '资源管理', icon: 'FolderOpened', roles: ['ADMIN'] },
      },
      {
        path: 'reports',
        name: 'AdminReports',
        component: () => import('@/views/admin/ReportsPage.vue'),
        meta: { title: '报告管理', icon: 'Document', roles: ['ADMIN', 'SCHOOL_LEADER'] },
      },
      {
        path: 'subjects',
        name: 'AdminSubjects',
        component: () => import('@/views/admin/SubjectManagePage.vue'),
        meta: { title: '学科分类管理', icon: 'FolderOpened', roles: ['ADMIN'] },
      },
      {
        path: 'literacy-config',
        name: 'AdminLiteracyConfig',
        component: () => import('@/views/admin/LiteracyConfig.vue'),
        meta: { title: '素养配置管理', icon: 'Setting', roles: ['ADMIN'] },
      },
      {
        path: 'student-literacy',
        name: 'AdminStudentLiteracy',
        component: () => import('@/views/admin/StudentLiteracyList.vue'),
        meta: { title: '学生素养看板', icon: 'DataAnalysis', roles: ['ADMIN', 'SCHOOL_LEADER'] },
      },
    ],
  },

  // 错误页
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/error/403Page.vue'),
    meta: { title: '无权限', hideInMenu: true },
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/error/404Page.vue'),
    meta: { title: '页面不存在', hideInMenu: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ===================== 路由守卫 =====================
router.beforeEach((to, _from) => {
  const authStore = useAuthStore()

  // 1. 已登录访问 /login → 跳首页
  if (to.path === '/login' && authStore.isLoggedIn) {
    return '/home'
  }

  // 2. 需要登录但未登录 → 跳登录页
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 3. 角色权限校验
  const requiredRoles = to.meta.roles
  if (requiredRoles && requiredRoles.length > 0 && authStore.isLoggedIn) {
    if (!authStore.hasAnyRole(requiredRoles)) {
      return '/403'
    }
  }
  // 放行
})

export default router
