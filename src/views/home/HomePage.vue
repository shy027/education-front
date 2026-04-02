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
            :key="c.courseId || c.id"
            class="course-item"
            @click="$router.push(`/course/${c.courseId || c.id}`)"
          >
            <div class="course-cover">
              <img v-if="c.courseCover || c.cover" :src="c.courseCover || c.cover" :alt="c.courseName" />
              <div v-else class="cover-placeholder">
                <el-icon :size="28" color="#fff"><Reading /></el-icon>
              </div>
            </div>
            <div class="course-info">
              <div class="course-name">{{ c.courseName }}</div>
              <div class="course-meta">
                <span v-if="c.teacherName">{{ c.teacherName }}</span>
                <span v-if="c.subjectArea" class="subject">{{ c.subjectArea }}</span>
                <el-tag size="small" :type="courseStatusType(c.status)">
                  {{ courseStatusLabel(c.status) }}
                </el-tag>
              </div>
              <div class="course-members">
                <el-icon><UserFilled /></el-icon>
                {{ c.studentCount ?? c.memberCount ?? 0 }} 人参与
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最新资源 -->
      <div class="home-section resource-section">
        <div class="section-header">
          <h3>
            <el-icon><Collection /></el-icon>
            最新资源
          </h3>
          <el-button text type="primary" @click="$router.push('/resource')">查看全部</el-button>
        </div>

        <div v-if="resLoading" class="loading-placeholder">
          <el-skeleton :rows="3" animated />
        </div>

        <el-empty v-else-if="!latestResources.length" description="暂无资源，去资源中心看看吧" :image-size="80">
          <el-button type="primary" @click="$router.push('/resource')">浏览资源</el-button>
        </el-empty>

        <div v-else class="resource-list">
          <div
            v-for="r in latestResources"
            :key="r.id"
            class="resource-item"
            @click="$router.push(`/resource/detail/${r.id}`)"
          >
            <div class="resource-cover">
              <img v-if="r.coverUrl" :src="r.coverUrl" :alt="r.title" />
              <div v-else class="cover-placeholder">
                <el-icon :size="28" color="#fff"><component :is="getResourceIcon(r.resourceType)" /></el-icon>
              </div>
            </div>
            <div class="resource-info">
              <div class="resource-title">{{ r.title }}</div>
              <div class="resource-meta">
                <span>{{ r.creatorName }}</span>
                <span class="dot">•</span>
                <span>{{ formatDate(r.createdTime) }}</span>
              </div>
              <div class="resource-stats">
                <el-icon><View /></el-icon>
                {{ r.viewCount || 0 }} 次查看
              </div>
            </div>
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
import type { MyCourseItem } from '@/api/course'
import { getResourceList } from '@/api/resource'
import type { ResourceItem } from '@/api/resource'
import {
  Reading, UserFilled, Collection, VideoCamera, Document, Microphone,
  View,
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
const myCourses = ref<MyCourseItem[]>([])

async function fetchMyCourses() {
  loading.value = true
  try {
    const res = await getMyCourses()
    // 后端返回字段名称： teaching/learning/assisting
    if (authStore.isTeacher) {
      myCourses.value = [...(res.teaching ?? []), ...(res.assisting ?? [])].slice(0, 4)
    } else {
      myCourses.value = (res.learning ?? []).slice(0, 4)
    }
  } catch {
    myCourses.value = []
  } finally {
    loading.value = false
  }
}

function courseStatusType(status: number): '' | 'success' | 'info' | 'warning' | 'danger' {
  return ({ 0: 'info', 1: 'success', 2: 'warning' } as Record<number, '' | 'success' | 'info' | 'warning' | 'danger'>)[status] ?? 'info'
}

function courseStatusLabel(status: number): string {
  return ({ 0: '暂未开放', 1: '进行中', 2: '已结课' } as Record<number, string>)[status] ?? '未知'
}

// ───── 资源展示 ─────
const resLoading = ref(false)
const latestResources = ref<ResourceItem[]>([])

async function fetchLatestResources() {
  resLoading.value = true
  try {
    const res = await getResourceList({
      status: 2, // 已发布
      pageSize: 4,
      pageNum: 1
    })
    latestResources.value = res.list || []
  } catch {
    latestResources.value = []
  } finally {
    resLoading.value = false
  }
}

function getResourceIcon(type: number) {
  return {
    1: markRaw(Document),
    2: markRaw(VideoCamera),
    3: markRaw(Document),
    4: markRaw(Microphone),
  }[type] || markRaw(Collection)
}

function formatDate(timeStr?: string) {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

onMounted(() => {
  fetchMyCourses()
  fetchLatestResources()
})
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

/* ===== 统计卡片 (已隐藏) ===== */

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
  display: flex;
  flex-direction: column;
  gap: 20px;
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
.course-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.course-item {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid #f5f5f5;
}
.course-item:hover { background: #fff8f8; border-color: #ffcdd2; }

.course-cover {
  width: 96px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #d32f2f, #ff5252);
}
.course-cover img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.course-name { font-size: 16px; font-weight: 700; color: #263238; margin-bottom: 6px; }
.course-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 13px; color: #78909c; }
.course-members { font-size: 13px; color: #90a4ae; display: flex; align-items: center; gap: 4px; }

/* ===== 资源列表 ===== */
.resource-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.resource-item {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid #f5f5f5;
}
.resource-item:hover { background: #f8fbff; border-color: #bbdefb; }

.resource-cover {
  width: 96px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
}
.resource-cover img { width: 100%; height: 100%; object-fit: cover; }

.resource-title { font-size: 16px; font-weight: 700; color: #263238; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.resource-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 13px; color: #78909c; }
.resource-meta .dot { font-weight: bold; }
.resource-stats { font-size: 13px; color: #90a4ae; display: flex; align-items: center; gap: 4px; }


.loading-placeholder { padding: 12px 0; }

@media (max-width: 960px) {
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .home-grid  { grid-template-columns: 1fr; }
}
</style>
