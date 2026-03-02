<template>
  <div class="community-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">研讨社区</h2>
        <p class="page-desc">参与课程思政专题讨论，分享学习见解，共同成长</p>
      </div>
      <!-- 仅教师可创建话题（API 规定 POST /posts 需要 TEACHER 权限） -->
      <el-button v-if="authStore.isTeacher" type="primary" class="create-btn" :icon="Plus" @click="showCreateDialog = true">发布话题</el-button>
    </div>

    <!-- 课程选择 -->
    <div class="course-selector">
      <div class="top-row">
        <el-select v-model="selectedCourseId" placeholder="选择课程查看研讨" style="width:220px" @change="onCourseChange">
          <el-option v-for="c in myCourseOptions" :key="c.id" :label="c.courseName" :value="c.id" />
        </el-select>
        <!-- 关键词搜索 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索话题标题..."
          :prefix-icon="Search"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
      </div>
      <div class="filter-pills">
        <button
          v-for="f in filters"
          :key="f.key"
          class="pill"
          :class="{ active: activeFilter === f.key }"
          @click="applyFilter(f.key)"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- 话题列表 -->
    <div v-loading="loading" class="content-area">
      <el-empty v-if="!selectedCourseId" description="请先选择课程" :image-size="100" />
      <el-empty v-else-if="!posts.records.length && !loading" description="暂无讨论话题" :image-size="100">
        <el-button v-if="authStore.isTeacher" class="create-btn" @click="showCreateDialog = true">发起第一个话题</el-button>
        <span v-else style="font-size:13px;color:#90a4ae">等待教师发布讨论话题</span>
      </el-empty>

      <div v-else class="post-list">
        <div
          v-for="p in posts.records"
          :key="p.id"
          class="post-card"
          @click="$router.push(`/community/topic/${p.id}`)"
        >
          <div class="post-left">
            <el-avatar :size="42" :src="p.authorAvatar">{{ p.authorName?.charAt(0) }}</el-avatar>
          </div>
          <div class="post-main">
            <div class="post-title">
              <el-tag v-if="p.isTop" size="small" type="danger" class="badge">置顶</el-tag>
              <el-tag v-if="p.isEssence" size="small" type="warning" class="badge">精华</el-tag>
              <span>{{ p.title }}</span>
            </div>
            <div class="post-meta">
              <span>{{ p.authorName }}</span>
              <span>{{ p.createdTime?.slice(0, 10) }}</span>
            </div>
          </div>
          <div class="post-right">
            <div class="stat-item"><el-icon><ChatDotRound /></el-icon>{{ p.commentCount }}</div>
            <div class="stat-item"><el-icon><Star /></el-icon>{{ p.likeCount }}</div>
          </div>
          <!-- 教师操作 -->
          <div v-if="authStore.isTeacher" class="post-actions" @click.stop>
            <el-dropdown trigger="click" @command="(cmd: string) => handlePostAction(cmd, p)">
              <el-button text :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="p.isTop ? 'untop' : 'top'">{{ p.isTop ? '取消置顶' : '设为置顶' }}</el-dropdown-item>
                  <el-dropdown-item :command="p.isEssence ? 'unessence' : 'essence'">{{ p.isEssence ? '取消精华' : '设为精华' }}</el-dropdown-item>
                  <el-dropdown-item command="delete" style="color:#d32f2f">删除话题</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-if="posts.total > query.pageSize!"
          v-model:current-page="query.pageNum"
          :page-size="query.pageSize"
          :total="posts.total"
          layout="prev, pager, next"
          background
          @current-change="fetchPosts"
        />
      </div>
    </div>

    <!-- 发布话题对话框（仅教师可操作） -->
    <el-dialog v-model="showCreateDialog" title="发布讨论话题" width="520px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="60px" size="large">
        <el-form-item label="标题" required>
          <el-input v-model="createForm.title" placeholder="请输入话题标题（必填）" clearable maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="createForm.content" type="textarea" :rows="5" placeholder="详细描述您的话题（选填）" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" class="red-confirm-btn" @click="handleCreate">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ChatDotRound, Star, MoreFilled, Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getMyCourses } from '@/api/course'
import type { CourseItem } from '@/api/course'
import { getPostList, createPost, deletePost, togglePostTop, togglePostEssence } from '@/api/community'
import type { PostItem } from '@/api/community'
import type { PageResponse } from '@/types/api'

const authStore = useAuthStore()

// ───── 课程选择 ─────
const selectedCourseId = ref('')
const myCourseOptions = ref<CourseItem[]>([])

async function fetchMyCourses() {
  const res = await getMyCourses()
  myCourseOptions.value = authStore.isTeacher ? (res.teachingCourses ?? []) : (res.joinedCourses ?? [])
  if (myCourseOptions.value.length) {
    selectedCourseId.value = myCourseOptions.value[0].id
    onCourseChange()
  }
}

// ───── 筛选 ─────
const activeFilter = ref<string>('all')
const searchKeyword = ref('')
const filters = [
  { key: 'all', label: '全部' },
  { key: 'top', label: '置顶' },
  { key: 'essence', label: '精华' },
]

// ───── 查询 ─────
const loading = ref(false)
const posts = ref<PageResponse<PostItem>>({ records: [], total: 0, pageNum: 1, pageSize: 15 })
const query = reactive({ pageNum: 1, pageSize: 15, isTop: undefined as number | undefined, isEssence: undefined as number | undefined })

function applyFilter(key: string) {
  activeFilter.value = key
  query.isTop = key === 'top' ? 1 : undefined
  query.isEssence = key === 'essence' ? 1 : undefined
  query.pageNum = 1
  fetchPosts()
}

function onCourseChange() {
  query.pageNum = 1
  fetchPosts()
}

async function fetchPosts() {
  if (!selectedCourseId.value) return
  loading.value = true
  try {
    posts.value = await getPostList({
      courseId: selectedCourseId.value,
      keyword: searchKeyword.value || undefined,
      ...query,
    })
  } finally { loading.value = false }
}

function handleSearch() {
  query.pageNum = 1
  fetchPosts()
}

// ───── 发布话题 ─────
const showCreateDialog = ref(false)
const creating = ref(false)
const createForm = reactive({ title: '', content: '' })

async function handleCreate() {
  if (!createForm.title.trim()) { ElMessage.warning('请输入话题标题'); return }
  if (!selectedCourseId.value) { ElMessage.warning('请先选择课程'); return }
  creating.value = true
  try {
    await createPost({ courseId: selectedCourseId.value, title: createForm.title, content: createForm.content })
    ElMessage.success('话题已发布')
    showCreateDialog.value = false
    Object.assign(createForm, { title: '', content: '' })
    fetchPosts()
  } finally { creating.value = false }
}

// ───── 教师操作 ─────
async function handlePostAction(cmd: string, post: PostItem) {
  if (cmd === 'top') { await togglePostTop(post.id, 1); post.isTop = 1; ElMessage.success('已置顶') }
  else if (cmd === 'untop') { await togglePostTop(post.id, 0); post.isTop = 0; ElMessage.success('已取消置顶') }
  else if (cmd === 'essence') { await togglePostEssence(post.id, 1); post.isEssence = 1; ElMessage.success('已设为精华') }
  else if (cmd === 'unessence') { await togglePostEssence(post.id, 0); post.isEssence = 0; ElMessage.success('已取消精华') }
  else if (cmd === 'delete') {
    await ElMessageBox.confirm('确定删除该话题及其下所有评论？', '删除确认', { type: 'warning' })
    await deletePost(post.id)
    ElMessage.success('已删除')
    fetchPosts()
  }
}

onMounted(fetchMyCourses)
</script>

<style scoped>
.community-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.create-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important;
}

.course-selector { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

.filter-pills { display: flex; gap: 6px; }

.pill {
  padding: 5px 14px; border: 1.5px solid #e0e0e0; background: #fff;
  border-radius: 20px; font-size: 13px; color: #78909c; cursor: pointer; transition: all 0.2s;
}
.pill:hover { border-color: #ffcdd2; color: #d32f2f; }
.pill.active { background: #d32f2f; border-color: #d32f2f; color: #fff; }

.content-area { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }

.post-list { display: flex; flex-direction: column; gap: 10px; }

.post-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; border-radius: 12px; border: 1px solid #f0f0f0;
  cursor: pointer; transition: all 0.2s;
  position: relative;
}
.post-card:hover { border-color: #ffcdd2; background: #fff8f8; }

.post-main { flex: 1; min-width: 0; }
.post-title { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: #263238; margin-bottom: 5px; }
.badge { flex-shrink: 0; }
.post-meta { display: flex; gap: 10px; font-size: 12px; color: #90a4ae; }

.post-right { display: flex; gap: 14px; flex-shrink: 0; }
.stat-item { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #90a4ae; }

.post-actions { flex-shrink: 0; }

.pagination-wrap { display: flex; justify-content: center; padding-top: 16px; }

:deep(.red-confirm-btn) {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
}
</style>
