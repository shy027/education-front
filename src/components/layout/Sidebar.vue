<template>
  <div class="sidebar" :class="{ collapsed }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-icon">
        <el-icon size="20" color="#fff"><Reading /></el-icon>
      </div>
      <transition name="fade-text">
        <span v-if="!collapsed" class="logo-text">育人平台</span>
      </transition>
    </div>

    <!-- 菜单列表 -->
    <el-scrollbar class="sidebar-scroll">
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon class="nav-icon"><component :is="iconMap[item.icon]" /></el-icon>
          <transition name="fade-text">
            <span v-if="!collapsed" class="nav-label">{{ item.title }}</span>
          </transition>
          <!-- 激活指示条 -->
          <span v-if="isActive(item.path) && !collapsed" class="active-bar" />
        </router-link>
      </nav>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import {
  Reading, House, ChatDotRound, FolderOpened, DataLine, User,
  DataBoard, UserFilled, OfficeBuilding, CircleCheckFilled, Document,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { STUDENT_MENUS, TEACHER_MENUS, ADMIN_MENUS } from '@/constants'

defineProps<{ collapsed: boolean }>()

const route = useRoute()
const authStore = useAuthStore()

const menus = computed(() => {
  if (authStore.isAdmin || authStore.isSchoolLeader) return ADMIN_MENUS
  if (authStore.isTeacher) return TEACHER_MENUS
  return STUDENT_MENUS
})

/** 判断当前路由是否匹配菜单项（前缀匹配） */
function isActive(path: string): boolean {
  if (path === '/home') return route.path === '/home'
  return route.path.startsWith(path)
}

const iconMap: Record<string, ReturnType<typeof markRaw>> = {
  House: markRaw(House),
  Reading: markRaw(Reading),
  ChatDotRound: markRaw(ChatDotRound),
  FolderOpened: markRaw(FolderOpened),
  DataLine: markRaw(DataLine),
  User: markRaw(User),
  DataBoard: markRaw(DataBoard),
  UserFilled: markRaw(UserFilled),
  OfficeBuilding: markRaw(OfficeBuilding),
  CircleCheckFilled: markRaw(CircleCheckFilled),
  Document: markRaw(Document),
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--sidebar-bg-from) 0%, var(--sidebar-bg-to) 100%);
  transition: width 0.25s ease;
  user-select: none;
}

/* ===== Logo ===== */
.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  overflow: hidden;
}

.logo-icon {
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

/* ===== 滚动区 ===== */
.sidebar-scroll { flex: 1; }

/* ===== 导航 ===== */
.sidebar-nav {
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.nav-label { font-size: 14px; }

.active-bar {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 2px;
}

/* ===== 折叠态 ===== */
.sidebar.collapsed .nav-item {
  padding: 10px;
  justify-content: center;
}

.sidebar.collapsed .sidebar-logo {
  padding: 0;
  justify-content: center;
}

/* ===== 淡入淡出 ===== */
.fade-text-enter-active,
.fade-text-leave-active {
  transition: opacity 0.15s ease;
}
.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}
</style>
