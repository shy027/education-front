<template>
  <div class="sidebar" :class="{ collapsed }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-icon">
        <el-icon size="22" color="#fff"><Reading /></el-icon>
      </div>
      <transition name="fade-text">
        <span v-if="!collapsed" class="logo-text">育人平台</span>
      </transition>
    </div>

    <!-- 菜单 -->
    <el-scrollbar class="sidebar-scroll">
      <el-menu
        :default-active="activeRoute"
        :collapse="collapsed"
        :collapse-transition="false"
        background-color="transparent"
        text-color="rgba(255,255,255,0.75)"
        active-text-color="#ffffff"
        router
        class="sidebar-menu"
      >
        <el-menu-item
          v-for="item in menus"
          :key="item.path"
          :index="item.path"
        >
          <el-icon><component :is="icons[item.icon]" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Reading,
  House,
  ChatDotRound,
  FolderOpened,
  DataLine,
  User,
  DataBoard,
  UserFilled,
  OfficeBuilding,
  CircleCheckFilled,
  Document,
} from '@element-plus/icons-vue'
import { STUDENT_MENUS, TEACHER_MENUS, ADMIN_MENUS } from '@/constants'

const props = defineProps<{ collapsed: boolean }>()

const route = useRoute()
const authStore = useAuthStore()

const activeRoute = computed(() => '/' + route.path.split('/')[1])

const menus = computed(() => {
  if (authStore.isAdmin || authStore.isSchoolLeader) return ADMIN_MENUS
  if (authStore.isTeacher) return TEACHER_MENUS
  return STUDENT_MENUS
})

// Icon 映射
const icons: Record<string, ReturnType<typeof markRaw>> = {
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
  background: linear-gradient(180deg, #1a2557 0%, #1e3a8a 100%);
  transition: width 0.25s ease;
}

.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.logo-icon {
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}

.sidebar-scroll {
  flex: 1;
}

.sidebar-menu {
  border: none;
  padding: 8px 0;
}

/* 全局 override - Element Plus 菜单激活状态 */
:deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.15) !important;
  border-radius: 8px;
  margin: 2px 8px;
  width: calc(100% - 16px);
}

:deep(.el-menu-item) {
  border-radius: 8px;
  margin: 2px 8px;
  width: calc(100% - 16px);
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;
}

:deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
}

.collapsed :deep(.el-menu-item) {
  margin: 2px 4px;
  width: calc(100% - 8px);
  padding: 0 !important;
  justify-content: center;
}

/* 文字淡入淡出 */
.fade-text-enter-active,
.fade-text-leave-active {
  transition: opacity 0.2s;
}
.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
}
</style>
