/** 用户角色枚举 */
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SCHOOL_LEADER: 'SCHOOL_LEADER',
  TEACHER: 'TEACHER',
  ASSISTANT: 'ASSISTANT',
  STUDENT: 'STUDENT',
} as const

/** 角色显示名称 */
export const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理员',
  SCHOOL_LEADER: '校领导',
  TEACHER: '教师',
  ASSISTANT: '助教',
  STUDENT: '学生',
}

/** 用户状态 */
export const USER_STATUS = {
  DISABLED: 0,
  ENABLED: 1,
} as const

export const USER_STATUS_LABEL: Record<number, string> = {
  0: '禁用',
  1: '启用',
}

/** 通用启用/禁用标签颜色 */
export const STATUS_TAG_TYPE: Record<number, string> = {
  0: 'danger',
  1: 'success',
}

/** 课程状态 */
export const COURSE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
} as const

export const COURSE_STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '审核中',
  PUBLISHED: '已发布',
  REJECTED: '已拒绝',
  ARCHIVED: '已归档',
}

/** 课程访问类型 */
export const COURSE_ACCESS = {
  PUBLIC: 'PUBLIC',
  APPROVAL: 'APPROVAL',
} as const

export const COURSE_ACCESS_LABEL: Record<string, string> = {
  PUBLIC: '公开加入',
  APPROVAL: '审批加入',
}

/** 审核状态 */
export const AUDIT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export const AUDIT_STATUS_LABEL: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
}

/** 资源状态 */
export const RESOURCE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
} as const

/** 本地存储 Key */
export const STORAGE_KEYS = {
  TOKEN: 'edu_token',
  USER_INFO: 'edu_user_info',
} as const

/** 各模块菜单路由配置（供侧边栏使用） */
export const STUDENT_MENUS = [
  { title: '首页', icon: 'House', path: '/home' },
  { title: '我的课程', icon: 'Reading', path: '/course' },
  { title: '资源库', icon: 'FolderOpened', path: '/resource' },
  { title: '素养报告', icon: 'DataLine', path: '/report' },
  { title: '个人中心', icon: 'User', path: '/profile' },
]

export const TEACHER_MENUS = [
  { title: '首页', icon: 'House', path: '/home' },
  { title: '课程管理', icon: 'Reading', path: '/course' },
  { title: '资源库', icon: 'FolderOpened', path: '/resource' },
  { title: '课程报告', icon: 'DataLine', path: '/report' },
  { title: '个人中心', icon: 'User', path: '/profile' },
]

export const FRONT_MENUS = [
  { title: '首页', icon: 'House', path: '/home' },
  { title: '课程', icon: 'Reading', path: '/course' },
  { title: '资源', icon: 'FolderOpened', path: '/resource' },
  { title: '报告', icon: 'DataLine', path: '/report' },
  { title: '院校', icon: 'OfficeBuilding', path: '/schools' },
]

/** 后台侧边栏：校领导的后台菜单（包含学校相关后台管理） */
export const SCHOOL_LEADER_MENUS = [
  { title: '数据看板', icon: 'DataBoard', path: '/admin/dashboard' },
  { title: '学校管理', icon: 'OfficeBuilding', path: '/admin/schools' },
  { title: '内容审核', icon: 'CircleCheckFilled', path: '/admin/audit' },
  { title: '报告管理', icon: 'Document', path: '/admin/reports' },
]

/** 后台侧边栏：超级管理员的后台菜单（全量） */
export const ADMIN_MENUS = [
  { title: '数据看板', icon: 'DataBoard', path: '/admin/dashboard' },
  { title: '用户管理', icon: 'UserFilled', path: '/admin/users' },
  { title: '学校管理', icon: 'OfficeBuilding', path: '/admin/schools' },
  { title: '审核中心', icon: 'CircleCheckFilled', path: '/admin/audit' },
  { title: '资源管理', icon: 'FolderOpened', path: '/admin/resources' },
  { title: '报告管理', icon: 'Document', path: '/admin/reports' },
  { title: '学科管理', icon: 'FolderOpened', path: '/admin/subjects' },
]
