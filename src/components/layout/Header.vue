<template>
  <div class="app-header">
    <!-- 左：折叠按钮 + 面包屑 -->
    <div class="header-left">
      <el-button
        class="collapse-btn"
        :icon="appStore.sidebarCollapsed ? Expand : Fold"
        text
        size="large"
        @click="emit('toggle-sidebar')"
      />
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">后台数据</el-breadcrumb-item>
        <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 右：通知 + 用户头像 -->
    <div class="header-right">
      <el-button text circle class="icon-btn" :icon="Bell" />

      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-info">
          <el-avatar :src="authStore.userInfo?.avatar" :size="32" class="header-avatar">
            {{ authStore.userInfo?.realName?.charAt(0) || authStore.userInfo?.username?.charAt(0) }}
          </el-avatar>
          <span class="username">
            {{ authStore.userInfo?.realName || authStore.userInfo?.username }}
          </span>
          <el-icon class="arrow-icon"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="front" :icon="House">返回前台</el-dropdown-item>
            <el-dropdown-item command="profile" :icon="User" divided>个人中心</el-dropdown-item>
            <el-dropdown-item divided command="logout" :icon="SwitchButton">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Fold, Expand, Bell, User, SwitchButton, ArrowDown, House } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const emit = defineEmits<{ 'toggle-sidebar': [] }>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const currentTitle = computed(() => route.meta.title as string | undefined)

async function handleCommand(cmd: string) {
  if (cmd === 'profile') {
    router.push('/profile')
  } else if (cmd === 'front') {
    router.push('/home')
  } else if (cmd === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    }).catch(() => null)
    authStore.logout()
    router.replace('/login')
  }
}
</script>

<style scoped>
.app-header {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 0 8px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-btn { color: #546e7a; }
.breadcrumb { font-size: 14px; }

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn { color: #546e7a; }

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-info:hover { background: var(--primary-hover); }

.header-avatar { border: 2px solid #ffcdd2; }

.username {
  font-size: 14px;
  color: var(--el-text-color-primary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon { font-size: 12px; color: var(--el-text-color-secondary); }
</style>
