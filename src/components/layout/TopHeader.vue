<template>
  <div class="top-header">
    <div class="header-content">
      <!-- 左：Logo -->
      <div class="header-left" @click="router.push('/home')">
        <div class="logo-icon">
          <el-icon size="20" color="#fff"><Reading /></el-icon>
        </div>
        <span class="logo-text">育人平台</span>
      </div>

      <!-- 中：导航菜单 -->
      <nav class="header-nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          {{ item.title }}
        </router-link>
      </nav>

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
              <el-dropdown-item command="profile" :icon="User">个人中心</el-dropdown-item>
              
              <!-- 只有管理员/校领导才显示后台入口 -->
              <el-dropdown-item 
                v-if="authStore.isAdmin || authStore.isSchoolLeader" 
                command="admin" 
                :icon="DataBoard"
                divided
              >
                进入管理后台
              </el-dropdown-item>
              
              <el-dropdown-item divided command="logout" :icon="SwitchButton">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Reading, Bell, User, SwitchButton, ArrowDown, DataBoard } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { FRONT_MENUS } from '@/constants'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 所有前台用户共享基础的前台导航
const menus = computed(() => {
  // 校领导拥有基础内容外加"学校管理"入口
  if (authStore.isSchoolLeader) {
    return [
      ...FRONT_MENUS,
      { title: '学校管理', path: '/admin/schools' } // 可以在前台直接跳转到后台的学校管理
    ]
  }
  return FRONT_MENUS
})

/** 判断当前路由是否匹配菜单项（前缀匹配） */
function isActive(path: string): boolean {
  if (path === '/home') return route.path === '/home'
  return route.path.startsWith(path)
}

async function handleCommand(cmd: string) {
  if (cmd === 'profile') {
    router.push('/profile')
  } else if (cmd === 'admin') {
    router.push('/admin/dashboard')
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
.top-header {
  width: 100%;
  height: 60px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ===== 左：Logo ===== */
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #d32f2f, #ff5252);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(211, 47, 47, 0.3);
}

.logo-text {
  font-size: 18px;
  font-weight: 800;
  color: #263238;
  letter-spacing: 0.5px;
}

/* ===== 中：导航 ===== */
.header-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 100%;
}

.nav-item {
  position: relative;
  font-size: 15px;
  color: #546e7a;
  text-decoration: none;
  font-weight: 500;
  height: 100%;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.nav-item:hover {
  color: #d32f2f;
}

.nav-item.active {
  color: #d32f2f;
  font-weight: 600;
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #d32f2f;
  border-radius: 3px 3px 0 0;
}

/* ===== 右：信息 ===== */
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn { 
  color: #78909c; 
  font-size: 18px;
}
.icon-btn:hover {
  color: #455a64;
  background: #f5f7fa;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-info:hover { 
  background: #f5f7fa; 
}

.header-avatar { 
  border: 2px solid #ffebee; 
  background: #ff5252;
  color: #fff;
  font-size: 14px;
}

.username {
  font-size: 14px;
  color: #455a64;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow-icon { 
  font-size: 12px; 
  color: #90a4ae; 
}

/* 响应式调整 */
@media (max-width: 768px) {
  .header-nav { display: none; }
  .header-content { padding: 0 16px; }
  .username { display: none; }
}
</style>
