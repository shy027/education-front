<template>
  <div class="home-page">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="banner-content">
        <div class="banner-text">
          <h2>欢迎回来，{{ userInfo?.realName || userInfo?.username }} 👋</h2>
          <p>{{ roleDesc }}，继续您的教学与学习之旅</p>
        </div>
        <div class="banner-meta">
          <span>{{ currentDate }}</span>
          <el-tag class="banner-role-tag" size="small">{{ roleLabel }}</el-tag>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div v-for="s in statItems" :key="s.label" class="stat-card">
        <div class="stat-icon" :style="{ background: s.bg }">
          <el-icon :size="22" :color="s.color"><component :is="s.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-num">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="home-grid">
      <!-- 我的课程 -->
      <div class="home-section course-section">
        <div class="section-header">
          <h3>
            <el-icon><Reading /></el-icon>
            我的课程
          </h3>
          <el-button text type="primary" @click="$router.push('/course')">查看全部</el-button>
        </div>

        <div v-if="loading" class="loading-placeholder">
          <el-skeleton :rows="3" animated />
        </div>

        <el-empty v-else-if="!myCourses.length" description="暂无课程，去课程中心探索吧" :image-size="80">
          <el-button type="primary" @click="$router.push('/course')">浏览课程</el-button>
        </el-empty>

        <div v-else class="course-list">
          <div
            v-for="c in myCourses"
            :key="c.id"
            class="course-item"
            @click="$router.push(`/course/${c.id}`)"
          >
            <div class="course-cover">
              <img v-if="c.cover" :src="c.cover" :alt="c.courseName" />
              <div v-else class="cover-placeholder">
                <el-icon :size="28" color="#fff"><Reading /></el-icon>
              </div>
            </div>
            <div class="course-info">
              <div class="course-name">{{ c.courseName }}</div>
              <div class="course-meta">
                <span>{{ c.teacherName }}</span>
                <el-tag size="small" :type="courseStatusType(c.status)">
                  {{ courseStatusLabel(c.status) }}
                </el-tag>
              </div>
              <div class="course-members">
                <el-icon><UserFilled /></el-icon>
                {{ c.memberCount }} 人参与
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：最新动态 -->
      <div class="home-section notice-section">
        <div class="section-header">
          <h3><el-icon><Bell /></el-icon> 最新动态</h3>
        </div>
        <div class="notice-list">
          <div v-for="n in notices" :key="n.id" class="notice-item">
            <div class="notice-dot" :class="n.type" />
            <div class="notice-body">
              <div class="notice-text">{{ n.text }}</div>
              <div class="notice-time">{{ n.time }}</div>
            </div>
          </div>
          <div v-if="!notices.length" class="notice-empty">
            <el-icon><InfoFilled /></el-icon> 暂无最新动态
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getMyCourses } from '@/api/course'
import type { CourseItem } from '@/api/course'
import {
  Reading, UserFilled, Bell, InfoFilled,
  Collection, Comment, DataAnalysis, Trophy,
} from '@element-plus/icons-vue'
import { ROLE_LABEL } from '@/constants'

const authStore = useAuthStore()
const userInfo = computed(() => authStore.userInfo)

// ───── 角色信息 ─────
const roleLabel = computed(() => {
  const role = userInfo.value?.roles?.[0]
  return role ? (ROLE_LABEL[role] ?? role) : '用户'
})

const roleDesc = computed(() => {
  if (authStore.isAdmin) return '您是管理员'
  if (authStore.isTeacher) return '您是教师'
  return '您是学生'
})

const currentDate = computed(() => new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
}))

// ───── 我的课程 ─────
const loading = ref(false)
const myCourses = ref<CourseItem[]>([])

async function fetchMyCourses() {
  loading.value = true
  try {
    const res = await getMyCourses()
    myCourses.value = authStore.isTeacher
      ? (res.teachingCourses ?? []).slice(0, 6)
      : (res.joinedCourses ?? []).slice(0, 6)
  } catch {
    // 静默失败，显示空状态
  } finally {
    loading.value = false
  }
}

function courseStatusType(status: number): '' | 'success' | 'info' | 'warning' | 'danger' {
  return ({ 0: 'info', 1: 'success', 2: 'warning' } as Record<number, '' | 'success' | 'info' | 'warning' | 'danger'>)[status] ?? 'info'
}

function courseStatusLabel(status: number): string {
  return ({ 0: '草稿', 1: '进行中', 2: '已归档' } as Record<number, string>)[status] ?? '未知'
}

// ───── 统计卡片 ─────
const statItems = computed(() => {
  if (authStore.isTeacher) {
    return [
      { label: '教授课程', value: myCourses.value.length, icon: markRaw(Reading), color: '#d32f2f', bg: '#ffebee' },
      { label: '课程研讨', value: '—', icon: markRaw(Comment), color: '#1976d2', bg: '#e3f2fd' },
      { label: '发布资源', value: '—', icon: markRaw(Collection), color: '#388e3c', bg: '#e8f5e9' },
      { label: '平台评分', value: '—', icon: markRaw(Trophy), color: '#f57c00', bg: '#fff3e0' },
    ]
  }
  return [
    { label: '参与课程', value: myCourses.value.length, icon: markRaw(Reading), color: '#d32f2f', bg: '#ffebee' },
    { label: '完成任务', value: '—', icon: markRaw(DataAnalysis), color: '#388e3c', bg: '#e8f5e9' },
    { label: '参与研讨', value: '—', icon: markRaw(Comment), color: '#1976d2', bg: '#e3f2fd' },
    { label: '素养得分', value: '—', icon: markRaw(Trophy), color: '#f57c00', bg: '#fff3e0' },
  ]
})

// ───── 最新动态（静态示例，后期可扩展 websocket） ─────
const notices = ref<{ id: number; type: string; text: string; time: string }[]>([])

onMounted(fetchMyCourses)
</script>

<style scoped>
.home-page { display: flex; flex-direction: column; gap: 20px; }

/* ===== 欢迎横幅 ===== */
.welcome-banner {
  background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 60%, #ff5252 100%);
  border-radius: 16px;
  padding: 28px 32px;
  color: #fff;
}

.banner-content { display: flex; align-items: center; justify-content: space-between; }

.banner-text h2 { margin: 0 0 8px; font-size: 22px; font-weight: 700; }
.banner-text p  { margin: 0; font-size: 14px; opacity: 0.85; }

.banner-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font-size: 13px; opacity: 0.8; }

.banner-role-tag { background: rgba(255,255,255,0.25) !important; color: #fff !important; border: none !important; }

/* ===== 统计卡片 ===== */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.09); }

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-num  { font-size: 26px; font-weight: 800; color: #263238; line-height: 1; }
.stat-label{ font-size: 12px; color: #78909c; margin-top: 4px; }

/* ===== 主内容区 ===== */
.home-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: start;
}

.home-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.section-header h3 {
  display: flex; align-items: center; gap: 8px;
  margin: 0; font-size: 16px; font-weight: 700; color: #263238;
}
.section-header .el-icon { color: #d32f2f; }

/* ===== 课程列表 ===== */
.course-list { display: flex; flex-direction: column; gap: 12px; }

.course-item {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid #f5f5f5;
}
.course-item:hover { background: #fff8f8; border-color: #ffcdd2; }

.course-cover {
  width: 72px;
  height: 54px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #d32f2f, #ff5252);
}
.course-cover img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.course-name { font-size: 14px; font-weight: 600; color: #263238; margin-bottom: 4px; }
.course-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px; color: #78909c; }
.course-members { font-size: 12px; color: #90a4ae; display: flex; align-items: center; gap: 4px; }

/* ===== 动态 ===== */
.notice-list { display: flex; flex-direction: column; gap: 12px; }

.notice-item { display: flex; gap: 10px; align-items: flex-start; }

.notice-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
}
.notice-dot.course  { background: #d32f2f; }
.notice-dot.task    { background: #1976d2; }
.notice-dot.system  { background: #78909c; }

.notice-text { font-size: 13px; color: #37474f; line-height: 1.5; }
.notice-time { font-size: 11px; color: #90a4ae; margin-top: 2px; }
.notice-empty { font-size: 13px; color: #b0bec5; display: flex; align-items: center; gap: 6px; }

.loading-placeholder { padding: 12px 0; }

@media (max-width: 960px) {
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .home-grid  { grid-template-columns: 1fr; }
}
</style>
