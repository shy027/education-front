<template>
  <div class="home-page">
    <div class="welcome-banner">
      <div class="banner-content">
        <h2>欢迎回来，{{ authStore.userInfo?.realName || authStore.userInfo?.username }} 👋</h2>
        <p>{{ schoolText }}</p>
      </div>
      <div class="banner-deco"></div>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6" v-for="stat in stats" :key="stat.label">
        <el-card class="stat-card" shadow="never">
          <div class="stat-inner">
            <div class="stat-icon" :style="{ background: stat.color }">
              <el-icon size="22" color="#fff"><component :is="stat.icon" /></el-icon>
            </div>
            <div>
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近课程 -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>最近课程</span>
          <el-button text type="primary" @click="$router.push('/course')">查看全部</el-button>
        </div>
      </template>
      <el-empty description="暂无课程，快去选课吧" :image-size="80" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { Reading, ChatDotRound, FolderOpened, DataLine } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const schoolText = computed(() =>
  authStore.userInfo?.schoolName
    ? `来自 ${authStore.userInfo.schoolName}`
    : '欢迎使用课程思政融合育人平台',
)

const stats = [
  { label: '我的课程', value: 0, color: '#4f8ef7', icon: markRaw(Reading) },
  { label: '研讨参与', value: 0, color: '#06b6d4', icon: markRaw(ChatDotRound) },
  { label: '资源收藏', value: 0, color: '#8b5cf6', icon: markRaw(FolderOpened) },
  { label: '素养得分', value: 0, color: '#f59e0b', icon: markRaw(DataLine) },
]
</script>

<style scoped>
.home-page { display: flex; flex-direction: column; gap: 20px; }

.welcome-banner {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  border-radius: 16px;
  padding: 28px 32px;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.welcome-banner h2 { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
.welcome-banner p { margin: 0; opacity: 0.8; font-size: 14px; }
.banner-deco {
  position: absolute; right: -30px; top: -30px;
  width: 180px; height: 180px;
  background: rgba(255,255,255,0.08); border-radius: 50%;
}

.stats-row { margin-top: 4px; }
.stat-card { border-radius: 12px; }
.stat-inner { display: flex; align-items: center; gap: 16px; }
.stat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-value { font-size: 24px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: var(--el-text-color-secondary); margin-top: 2px; }

.section-card { border-radius: 12px; }
.card-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
</style>
