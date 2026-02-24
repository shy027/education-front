<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <AppSidebar :collapsed="collapsed" />
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container class="right-container">
      <!-- 顶部 Header -->
      <el-header class="header" height="56px">
        <AppHeader @toggle-sidebar="toggleSidebar" />
      </el-header>

      <!-- 内容 -->
      <el-main class="main-content">
        <el-scrollbar>
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" class="page-wrapper" />
            </transition>
          </router-view>
        </el-scrollbar>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/layout/Sidebar.vue'
import AppHeader from '@/components/layout/Header.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const collapsed = ref(appStore.sidebarCollapsed)

function toggleSidebar() {
  collapsed.value = !collapsed.value
  appStore.setSidebarCollapsed(collapsed.value)
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}

.aside {
  background-color: var(--sidebar-bg);
  transition: width 0.25s ease;
  overflow: hidden;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.right-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 0;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.main-content {
  padding: 0;
  overflow: hidden;
  flex: 1;
  background: var(--bg-page);
}

.page-wrapper {
  padding: 24px;
  min-height: calc(100vh - 56px);
  box-sizing: border-box;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
