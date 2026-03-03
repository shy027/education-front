<template>
  <div class="course-detail-page" v-loading="pageLoading">
    <!-- 课程头部信息 -->
    <div class="course-hero" v-if="course">
      <div class="hero-cover">
        <img v-if="course.cover" :src="course.cover" :alt="course.courseName" />
        <div v-else class="cover-default"><el-icon :size="48" color="rgba(255,255,255,0.7)"><Reading /></el-icon></div>
      </div>
      <div class="hero-info">
        <div class="hero-badges">
          <el-tag size="small" :type="statusType(course.status)">{{ statusLabel(course.status) }}</el-tag>
          <el-tag size="small" type="info">{{ joinTypeLabel(course.joinType) }}</el-tag>
          <el-tag v-if="course.subjectArea" size="small">{{ course.subjectArea }}</el-tag>
        </div>
        <h1 class="hero-title">{{ course.courseName }}</h1>
        <p class="hero-desc">{{ course.description || '暂无课程介绍' }}</p>
        <div class="hero-meta">
          <span><el-icon><User /></el-icon> {{ course.teacherName }}</span>
          <span><el-icon><UserFilled /></el-icon> {{ course.memberCount }} 人参与</span>
        </div>
        <!-- 操作区 -->
        <div class="hero-actions">
          <!-- 加入/退出：仅学生可见，教师（无论是否是该课程创建者）均不显示 -->
          <el-button
            v-if="!authStore.isTeacher && !authStore.isAdmin && !isMember"
            type="primary"
            class="join-btn"
            :loading="joining"
            @click="handleJoin"
          >加入课程</el-button>
          <el-button
            v-if="!authStore.isTeacher && !authStore.isAdmin && isMember"
            type="danger"
            plain
            :loading="quitting"
            @click="handleQuit"
          >退出课程</el-button>
          <el-button
            v-if="authStore.isTeacher && isMyTeaching"
            :icon="Edit"
            @click="showEditDialog = true"
          >编辑课程</el-button>
        </div>
      </div>
    </div>

    <!-- Tab 内容 -->
    <el-tabs v-model="activeTab" class="content-tabs" @tab-click="onTabChange">
      <!-- ===== 课件 Tab ===== -->
      <el-tab-pane label="📚 课件" name="ware">
        <div class="ware-layout" v-loading="wareLoading">
          <!-- 左：章节树 -->
          <div class="chapter-tree">
            <div class="tree-header">
              章节目录
              <el-button v-if="isMyTeaching" text :icon="Plus" size="small" @click="showAddChapterDialog = true">
                添加章节
              </el-button>
            </div>
            <div v-if="chapters.length === 0" class="tree-empty">暂无章节</div>
            <div
              v-for="ch in chapters"
              :key="ch.id"
              class="chapter-item"
              :class="{ active: selectedChapterId === ch.id }"
              @click="selectChapter(ch.id)"
            >
              <el-icon><FolderOpened /></el-icon>
              {{ ch.title }}
            </div>
          </div>

          <!-- 右：课件列表 -->
          <div class="ware-list-wrap">
            <div class="ware-list-header">
              <span>{{ selectedChapterId ? '课件列表' : '全部课件' }}</span>
              <el-button v-if="isMyTeaching" type="primary" size="small" :icon="Plus" class="red-sm-btn" @click="showAddWareDialog = true">
                上传课件
              </el-button>
            </div>
            <div v-if="wares.length === 0" class="ware-empty">
              <el-empty description="该章节暂无课件" :image-size="60" />
            </div>
            <div
              v-for="w in wares"
              :key="w.id"
              class="ware-item"
              @click="openWare(w)"
            >
              <div class="ware-icon" :class="`type-${w.wareType}`">
                <el-icon><component :is="wareIcon(w.wareType)" /></el-icon>
              </div>
              <div class="ware-info">
                <div class="ware-title">{{ w.title }}</div>
                <div class="ware-meta">
                  <el-tag size="small" :type="wareAuditType(w.auditStatus)">{{ wareAuditLabel(w.auditStatus) }}</el-tag>
                  <span v-if="w.duration">{{ Math.floor(w.duration / 60) }}min</span>
                </div>
              </div>
              <div v-if="w.progress !== undefined" class="ware-progress">
                <el-progress :percentage="w.progress" :stroke-width="4" :show-text="false" color="#d32f2f" style="width:80px" />
                <span class="progress-text">{{ w.progress }}%</span>
              </div>
              <el-button v-if="isMyTeaching" text type="danger" size="small" :icon="Delete" @click.stop="deleteWareById(w.id)" />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== 任务 Tab ===== -->
      <el-tab-pane label="📋 任务" name="task">
        <div v-loading="taskLoading">
          <div class="tab-toolbar">
            <span class="toolbar-total">共 {{ tasks.length }} 项任务</span>
            <el-button v-if="isMyTeaching" type="primary" :icon="Plus" size="small" class="red-sm-btn" @click="showCreateTaskDialog = true">
              创建任务
            </el-button>
          </div>
          <el-empty v-if="!tasks.length" description="暂无任务" :image-size="80" />
          <div class="task-list">
            <div v-for="t in tasks" :key="t.id" class="task-item">
              <div class="task-type-icon" :class="`task-type-${t.taskType}`">
                {{ { 1: '作业', 2: '考试', 3: '讨论' }[t.taskType] }}
              </div>
              <div class="task-info">
                <div class="task-name">{{ t.taskName }}</div>
                <div class="task-meta">
                  <span v-if="t.endTime">截止：{{ t.endTime.slice(0, 10) }}</span>
                  <span v-if="t.totalScore">满分：{{ t.totalScore }} 分</span>
                  <el-tag size="small" :type="taskStatusType(t.status)">{{ taskStatusLabel(t.status) }}</el-tag>
                </div>
              </div>
              <div class="task-actions">
                <el-tag v-if="!isMyTeaching" size="small">{{ t.submitCount }} 人参与</el-tag>
                <el-button v-if="isMyTeaching" text type="danger" size="small" @click="deleteTaskById(t.id)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== 讨论 Tab ===== -->
      <el-tab-pane label="💬 讨论" name="discuss">
        <div v-loading="postLoading">
          <div class="tab-toolbar">
            <span class="toolbar-total">共 {{ posts.total }} 个话题</span>
            <!-- 仅教师可发布话题（API规定 POST /posts 需要 TEACHER 权限） -->
            <el-button v-if="isMyTeaching" type="primary" :icon="Plus" size="small" class="red-sm-btn" @click="showCreatePostDialog = true">
              发布话题
            </el-button>
          </div>
          <el-empty v-if="!posts.records.length" description="暂无讨论话题" :image-size="80" />
          <div class="post-list">
            <div
              v-for="p in posts.records"
              :key="p.id"
              class="post-item"
              @click="$router.push(`/community/topic/${p.id}`)"
            >
              <el-avatar :size="36" :src="p.authorAvatar">{{ p.authorName?.charAt(0) }}</el-avatar>
              <div class="post-content">
                <div class="post-title">
                  <el-tag v-if="p.isTop" size="small" type="danger" class="top-tag">置顶</el-tag>
                  <el-tag v-if="p.isEssence" size="small" type="warning" class="top-tag">精华</el-tag>
                  {{ p.title }}
                </div>
                <div class="post-meta">{{ p.authorName }} · {{ p.createdTime?.slice(0, 10) }}</div>
              </div>
              <div class="post-stats">
                <span><el-icon><ChatDotRound /></el-icon>{{ p.commentCount }}</span>
                <span><el-icon><Star /></el-icon>{{ p.likeCount }}</span>
              </div>
            </div>
          </div>
          <el-pagination
            v-if="posts.total > postQuery.pageSize!"
            v-model:current-page="postQuery.pageNum"
            :page-size="postQuery.pageSize"
            :total="posts.total"
            layout="prev, pager, next"
            background
            style="margin-top:16px"
            @current-change="fetchPosts"
          />
        </div>
      </el-tab-pane>

      <!-- ===== 公告 Tab ===== -->
      <el-tab-pane label="📢 公告" name="notice">
        <div v-loading="noticeLoading">
          <div class="tab-toolbar">
            <span />
            <el-button v-if="isMyTeaching" type="primary" :icon="Plus" size="small" class="red-sm-btn" @click="showCreateNoticeDialog = true">
              发布公告
            </el-button>
          </div>
          <el-empty v-if="!announcements.length" description="暂无公告" :image-size="80" />
          <div class="notice-list">
            <div v-for="n in announcements" :key="n.id" class="notice-item-card" @click="openNotice(n)">
              <div class="notice-header">
                <div class="notice-title">
                  <el-tag v-if="n.isTop" size="small" type="danger">置顶</el-tag>
                  {{ n.title }}
                </div>
                <div class="notice-time">{{ n.createdTime?.slice(0, 10) }}</div>
              </div>
              <p class="notice-preview">{{ n.content?.slice(0, 80) }}{{ n.content?.length > 80 ? '...' : '' }}</p>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 公告详情对话框 -->
    <el-dialog v-model="noticeDialogVisible" :title="selectedNotice?.title" width="600px">
      <div class="notice-full-content" v-html="selectedNotice?.content?.replace(/\n/g, '<br/>')" />
      <template #footer>
        <el-button @click="noticeDialogVisible = false">关闭</el-button>
        <el-button v-if="isMyTeaching" type="danger" plain @click="deleteNoticeById(selectedNotice!.id)">删除</el-button>
      </template>
    </el-dialog>

    <!-- 创建话题对话框 -->
    <el-dialog v-model="showCreatePostDialog" title="发布讨论话题" width="520px">
      <el-form :model="postForm" label-width="70px" size="large">
        <el-form-item label="标题" required>
          <el-input v-model="postForm.title" placeholder="输入话题标题" clearable />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="postForm.content" type="textarea" :rows="4" placeholder="描述您的讨论内容（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreatePostDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="postSubmitting" @click="handleCreatePost">发布</el-button>
      </template>
    </el-dialog>

    <!-- 发布公告对话框 -->
    <el-dialog v-model="showCreateNoticeDialog" title="发布公告" width="520px">
      <el-form :model="noticeForm" label-width="70px" size="large">
        <el-form-item label="标题" required>
          <el-input v-model="noticeForm.title" placeholder="公告标题" clearable />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="noticeForm.content" type="textarea" :rows="5" placeholder="公告内容" />
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="noticeForm.isTop" :active-value="1" :inactive-value="0" active-color="#d32f2f" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateNoticeDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="noticeSubmitting" @click="handleCreateNotice">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Reading, User, UserFilled, Plus, Edit, Delete,
  FolderOpened, VideoPlay, Document, Headset, ChatDotRound, Star,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getCourseDetail, getChapterTree, getCoursewareList, createCourseware, deleteCourseware,
  getTaskList, createTask, deleteTask,
  getAnnouncementList, createAnnouncement, deleteAnnouncement,
  joinCourse, quitCourse, getMyCourses,
} from '@/api/course'
import { getPostList, createPost } from '@/api/community'
import { logBehavior } from '@/api/report'
import type { CourseItem, ChapterNode, CoursewareItem, TaskItem, AnnouncementItem } from '@/api/course'
import type { PostItem } from '@/api/community'
import type { PageResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const courseId = computed(() => route.params.id as string)

// ───── 课程基本信息 ─────
const pageLoading = ref(false)
const course = ref<CourseItem | null>(null)
const isMember = ref(false)
const joining = ref(false)
const quitting = ref(false)
const showEditDialog = ref(false)

const isMyTeaching = computed(() =>
  authStore.isTeacher && course.value?.teacherId === authStore.userInfo?.userId,
)

function statusType(s: number): '' | 'info' | 'success' | 'warning' { return ({ 0: 'info', 1: 'success', 2: 'warning' } as Record<number, '' | 'info' | 'success' | 'warning'>)[s] ?? 'info' }
function statusLabel(s: number): string { return ({ 0: '草稿', 1: '进行中', 2: '已归档' } as Record<number, string>)[s] ?? '未知' }
function joinTypeLabel(t: number): string { return ({ 0: '公开加入', 1: '审批加入', 2: '邀请码' } as Record<number, string>)[t] ?? '' }

async function handleJoin() {
  joining.value = true
  try {
    await joinCourse(courseId.value)
    isMember.value = true
    ElMessage.success('加入成功！')
    if (course.value) course.value.memberCount++
  } finally { joining.value = false }
}

async function handleQuit() {
  await ElMessageBox.confirm('确定要退出本课程吗？', '提示', { type: 'warning' })
  quitting.value = true
  try {
    await quitCourse(courseId.value)
    isMember.value = false
    ElMessage.success('已退出课程')
    if (course.value) course.value.memberCount--
  } finally { quitting.value = false }
}

// ───── Tab ─────
const activeTab = ref('ware')

function onTabChange(tab: { paneName: string }) {
  if (tab.paneName === 'task' && !tasks.value.length) fetchTasks()
  if (tab.paneName === 'discuss' && !posts.value.records.length) fetchPosts()
  if (tab.paneName === 'notice' && !announcements.value.length) fetchAnnouncements()
}

// ───── 章节 & 课件 ─────
const wareLoading = ref(false)
const chapters = ref<ChapterNode[]>([])
const selectedChapterId = ref<string | undefined>(undefined)
const wares = ref<CoursewareItem[]>([])
const showAddChapterDialog = ref(false)
const showAddWareDialog = ref(false)

async function fetchChapters() {
  chapters.value = await getChapterTree(courseId.value)
}

async function fetchWares(chapterId?: string) {
  wareLoading.value = true
  try {
    const res = await getCoursewareList(courseId.value, { chapterId, pageSize: 50 })
    wares.value = res.records
  } finally { wareLoading.value = false }
}

function selectChapter(id: string) {
  selectedChapterId.value = selectedChapterId.value === id ? undefined : id
  fetchWares(selectedChapterId.value)
}

function wareIcon(type: number) {
  return { 1: markRaw(VideoPlay), 2: markRaw(Document), 3: markRaw(Document), 4: markRaw(Headset) }[type] ?? markRaw(Document)
}

function wareAuditType(status: number): '' | 'info' | 'success' | 'warning' | 'danger' {
  return ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' } as Record<number, '' | 'info' | 'success' | 'warning' | 'danger'>)[status] ?? 'info'
}

function wareAuditLabel(status: number): string {
  return ({ 0: '未提审', 1: '待审核', 2: '已通过', 3: '已拒绝' } as Record<number, string>)[status] ?? '—'
}

function openWare(w: CoursewareItem) {
  if (w.fileUrl) {
    window.open(w.fileUrl, '_blank')
  }
  // 学生行为埋点：上报观看课件行为
  if (!authStore.isTeacher && !authStore.isAdmin && authStore.userInfo?.userId) {
    const behaviorType = w.wareType === 1 ? 'WATCH_VIDEO' : 'READ_DOC'
    logBehavior({
      userId: authStore.userInfo.userId,
      courseId: courseId.value,
      behaviorType: behaviorType as 'WATCH_VIDEO' | 'READ_DOC',
      targetId: w.id,
    }).catch(() => { /* 埋点静默失败，不影响主流程 */ })
  }
}

async function deleteWareById(id: string) {
  await ElMessageBox.confirm('确定删除该课件吗？', '提示', { type: 'warning' })
  await deleteCourseware(id)
  wares.value = wares.value.filter((w) => w.id !== id)
  ElMessage.success('已删除')
}

// ───── 任务 ─────
const taskLoading = ref(false)
const tasks = ref<TaskItem[]>([])
const showCreateTaskDialog = ref(false)

function taskStatusType(s: number): '' | 'info' | 'success' | 'warning' { return ({ 0: 'info', 1: 'success', 2: 'warning' } as Record<number, '' | 'info' | 'success' | 'warning'>)[s] ?? 'info' }
function taskStatusLabel(s: number): string { return ({ 0: '草稿', 1: '进行中', 2: '已结束' } as Record<number, string>)[s] ?? '—' }

async function fetchTasks() {
  taskLoading.value = true
  try {
    const res = await getTaskList(courseId.value, { pageSize: 50 })
    tasks.value = res.records
  } finally { taskLoading.value = false }
}

async function deleteTaskById(id: string) {
  await ElMessageBox.confirm('确定删除该任务吗？', '提示', { type: 'warning' })
  await deleteTask(courseId.value, id)
  tasks.value = tasks.value.filter((t) => t.id !== id)
  ElMessage.success('已删除')
}

// ───── 讨论话题 ─────
const postLoading = ref(false)
const posts = ref<PageResponse<PostItem>>({ records: [], total: 0, pageNum: 1, pageSize: 10 })
const postQuery = reactive({ pageNum: 1, pageSize: 10 })
const showCreatePostDialog = ref(false)
const postSubmitting = ref(false)
const postForm = reactive({ title: '', content: '' })

async function fetchPosts() {
  postLoading.value = true
  try {
    const res = await getPostList({ courseId: courseId.value, ...postQuery })
    posts.value = res
  } finally { postLoading.value = false }
}

async function handleCreatePost() {
  if (!postForm.title.trim()) { ElMessage.warning('请输入话题标题'); return }
  postSubmitting.value = true
  try {
    await createPost({ courseId: courseId.value, title: postForm.title, content: postForm.content })
    ElMessage.success('发布成功')
    showCreatePostDialog.value = false
    Object.assign(postForm, { title: '', content: '' })
    fetchPosts()
  } finally { postSubmitting.value = false }
}

// ───── 公告 ─────
const noticeLoading = ref(false)
const announcements = ref<AnnouncementItem[]>([])
const showCreateNoticeDialog = ref(false)
const noticeSubmitting = ref(false)
const noticeForm = reactive({ title: '', content: '', isTop: 0 })
const noticeDialogVisible = ref(false)
const selectedNotice = ref<AnnouncementItem | null>(null)

async function fetchAnnouncements() {
  noticeLoading.value = true
  try {
    const res = await getAnnouncementList(courseId.value, { pageSize: 50 })
    announcements.value = res.records
  } finally { noticeLoading.value = false }
}

function openNotice(n: AnnouncementItem) {
  selectedNotice.value = n
  noticeDialogVisible.value = true
}

async function handleCreateNotice() {
  if (!noticeForm.title.trim() || !noticeForm.content.trim()) { ElMessage.warning('请填写标题和内容'); return }
  noticeSubmitting.value = true
  try {
    await createAnnouncement(courseId.value, { ...noticeForm })
    ElMessage.success('公告已发布')
    showCreateNoticeDialog.value = false
    Object.assign(noticeForm, { title: '', content: '', isTop: 0 })
    fetchAnnouncements()
  } finally { noticeSubmitting.value = false }
}

async function deleteNoticeById(id: string) {
  noticeDialogVisible.value = false
  await ElMessageBox.confirm('确定删除该公告吗？', '提示', { type: 'warning' })
  await deleteAnnouncement(courseId.value, id)
  announcements.value = announcements.value.filter((n) => n.id !== id)
  ElMessage.success('已删除')
}

// ───── 初始化 ─────
onMounted(async () => {
  pageLoading.value = true
  try {
    const [detail] = await Promise.all([
      getCourseDetail(courseId.value),
      fetchChapters(),
      fetchWares(),
      fetchAnnouncements(),
    ])
    course.value = detail

    // 教师/管理员不涉及加入退出，学生通过 getMyCourses 判断是否已加入
    if (!authStore.isTeacher && !authStore.isAdmin) {
      try {
        const myData = await getMyCourses()
        const joined = myData.learning ?? []
        isMember.value = joined.some((c) => String(c.courseId ?? c.id) === courseId.value)
      } catch {
        isMember.value = false
      }
    }
  } finally {
    pageLoading.value = false
  }
})
</script>

<style scoped>
/* ===== 课程头部 ===== */
.course-hero {
  display: flex;
  gap: 24px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  margin-bottom: 20px;
}

.hero-cover {
  width: 280px;
  flex-shrink: 0;
  min-height: 180px;
  background: linear-gradient(135deg, #b71c1c, #ff5252);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hero-cover img { width: 100%; height: 100%; object-fit: cover; }

.hero-info { padding: 24px; flex: 1; }

.hero-badges { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }

.hero-title { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #263238; }

.hero-desc { margin: 0 0 12px; font-size: 14px; color: #546e7a; line-height: 1.6; }

.hero-meta { display: flex; gap: 20px; font-size: 13px; color: #78909c; margin-bottom: 16px; }
.hero-meta .el-icon { vertical-align: middle; margin-right: 4px; }

.join-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 8px !important;
}

/* ===== Tabs ===== */
.content-tabs {
  background: #fff;
  border-radius: 16px;
  padding: 0 24px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
}

:deep(.el-tabs__item.is-active) { color: #d32f2f; }
:deep(.el-tabs__active-bar) { background: #d32f2f; }
:deep(.el-tabs__item:hover) { color: #d32f2f; }
:deep(.el-tabs__header) { padding-top: 4px; }

/* ===== 工具栏 ===== */
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.toolbar-total { font-size: 13px; color: #90a4ae; }

.red-sm-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 6px !important;
}

/* ===== 课件布局 ===== */
.ware-layout { display: flex; gap: 20px; min-height: 300px; }

.chapter-tree {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #f5f5f5;
  padding-right: 16px;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #455a64;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.tree-empty { font-size: 13px; color: #b0bec5; text-align: center; padding: 20px 0; }

.chapter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: #546e7a;
  cursor: pointer;
  transition: all 0.2s;
}
.chapter-item:hover { background: #fff8f8; color: #d32f2f; }
.chapter-item.active { background: #ffebee; color: #d32f2f; font-weight: 600; }
.chapter-item .el-icon { color: #d32f2f; }

.ware-list-wrap { flex: 1; }

.ware-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #455a64;
  margin-bottom: 12px;
}

.ware-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}
.ware-item:hover { border-color: #ffcdd2; background: #fff8f8; }

.ware-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.type-1 { background: #fce4ec; color: #d32f2f; }
.type-2 { background: #e3f2fd; color: #1976d2; }
.type-3 { background: #e8f5e9; color: #388e3c; }
.type-4 { background: #fff3e0; color: #f57c00; }

.ware-title { font-size: 14px; font-weight: 600; color: #263238; }
.ware-meta  { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12px; color: #90a4ae; }
.ware-progress { display: flex; align-items: center; gap: 6px; }
.progress-text { font-size: 11px; color: #90a4ae; }

.ware-empty { padding: 20px 0; }

/* ===== 任务列表 ===== */
.task-list { display: flex; flex-direction: column; gap: 10px; }

.task-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}

.task-type-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.task-type-1 { background: #ffebee; color: #d32f2f; }
.task-type-2 { background: #e3f2fd; color: #1976d2; }
.task-type-3 { background: #e8f5e9; color: #388e3c; }

.task-name { font-size: 14px; font-weight: 600; color: #263238; margin-bottom: 4px; }
.task-meta { display: flex; gap: 12px; align-items: center; font-size: 12px; color: #90a4ae; }
.task-actions { margin-left: auto; flex-shrink: 0; }

/* ===== 讨论帖子 ===== */
.post-list { display: flex; flex-direction: column; gap: 10px; }

.post-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.post-item:hover { border-color: #ffcdd2; background: #fff8f8; }

.post-content { flex: 1; min-width: 0; }
.post-title { font-size: 14px; font-weight: 600; color: #263238; display: flex; align-items: center; gap: 6px; }
.post-meta { font-size: 12px; color: #90a4ae; margin-top: 4px; }
.top-tag { margin-right: 4px; }
.post-stats { display: flex; gap: 12px; font-size: 12px; color: #90a4ae; flex-shrink: 0; }
.post-stats span { display: flex; align-items: center; gap: 4px; }

/* ===== 公告 ===== */
.notice-list { display: flex; flex-direction: column; gap: 12px; }

.notice-item-card {
  padding: 16px 20px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.notice-item-card:hover { border-color: #ffcdd2; background: #fff8f8; }

.notice-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.notice-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #263238; }
.notice-time { font-size: 12px; color: #90a4ae; }
.notice-preview { margin: 0; font-size: 13px; color: #546e7a; line-height: 1.6; }

.notice-full-content { font-size: 14px; color: #37474f; line-height: 1.8; white-space: pre-wrap; }

/* ===== 确认按钮 ===== */
:deep(.red-confirm-btn) {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
}
</style>
