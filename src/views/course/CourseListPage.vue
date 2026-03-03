<template>
  <div class="course-list-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ authStore.isTeacher ? '课程管理' : '课程中心' }}</h2>
        <p class="page-desc">{{ authStore.isTeacher ? '管理您创建的课程，或浏览加入其他课程' : '发现并加入感兴趣的课程' }}</p>
      </div>
      <el-button v-if="authStore.isTeacher" type="primary" :icon="Plus" class="create-btn" @click="showCreateDialog = true">
        创建课程
      </el-button>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-row">
      <div class="tab-nav">
        <button class="tab-item" :class="{ active: activeTab === 'all' }" @click="switchTab('all')">全部课程</button>
        <button class="tab-item" :class="{ active: activeTab === 'mine' }" @click="switchTab('mine')">
          {{ authStore.isTeacher ? '我教的课程' : '已加入课程' }}
        </button>
      </div>
      <!-- 搜索框 -->
      <el-input
        v-model="searchKeyword"
        placeholder="搜索课程名称..."
        :prefix-icon="Search"
        clearable
        style="width: 240px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="query" inline>
        <el-form-item label="学科领域">
          <el-input v-model="query.subjectArea" placeholder="不限" clearable style="width: 130px" />
        </el-form-item>
        <el-form-item label="加入方式">
          <el-select v-model="query.joinType" placeholder="不限" clearable style="width: 110px">
            <el-option label="公开加入" :value="0" />
            <el-option label="审批加入" :value="1" />
            <el-option label="邀请码" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="authStore.isTeacher || authStore.isAdmin" label="状态">
          <el-select v-model="query.status" placeholder="不限" clearable style="width: 100px">
            <el-option label="草稿" :value="0" />
            <el-option label="发布中" :value="1" />
            <el-option label="已归档" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 课程卡片网格 -->
    <div v-loading="loading" class="course-grid" element-loading-text="加载中...">
      <div
        v-for="c in courseList"
        :key="c.id"
        class="course-card"
        @click="$router.push(`/course/${c.id}`)"
      >
        <div class="card-cover">
          <img v-if="c.cover" :src="c.cover" :alt="c.courseName" />
          <div v-else class="cover-default">
            <el-icon :size="36" color="#fff"><Reading /></el-icon>
          </div>
          <el-tag class="status-tag" size="small" :type="statusType(c.status)">
            {{ statusLabel(c.status) }}
          </el-tag>
        </div>
        <div class="card-body">
          <h4 class="card-title">{{ c.courseName }}</h4>
          <p class="card-desc">{{ c.description || '暂无课程简介' }}</p>
          <div class="card-footer">
            <div class="card-teacher">
              <el-icon><User /></el-icon>
              {{ c.teacherName }}
            </div>
            <div class="card-members">
              <el-icon><UserFilled /></el-icon>
              {{ c.memberCount }}
            </div>
          </div>
          <!-- 加入/退出按钮（仅对学生身份） -->
          <div v-if="!authStore.isTeacher && !authStore.isAdmin" class="card-action" @click.stop>
            <el-button
              v-if="c.status === 1"
              size="small"
              class="join-btn"
              :loading="c._joining"
              @click="handleJoin(c)"
            >
              加入课程
            </el-button>
          </div>
        </div>
      </div>

      <el-empty v-if="!loading && !courseList.length" description="暂无课程" :image-size="100" />
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[12, 24, 48]"
        layout="total, sizes, prev, pager, next"
        background
        @change="fetchList"
      />
    </div>

    <!-- 创建课程对话框（教师专属） -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建课程"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetCreateForm"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="90px"
        size="large"
      >
        <el-form-item label="课程名称" prop="courseName">
          <el-input v-model="createForm.courseName" placeholder="请输入课程名称" clearable maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="课程简介">
          <el-input v-model="createForm.description" type="textarea" placeholder="请输入课程简介" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="学科领域">
          <el-input v-model="createForm.subjectArea" placeholder="如：马克思主义理论" clearable />
        </el-form-item>
        <el-form-item label="加入方式" prop="joinType">
          <el-radio-group v-model="createForm.joinType">
            <el-radio :value="0">公开加入</el-radio>
            <el-radio :value="1">审批加入</el-radio>
            <el-radio :value="2">邀请码</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="createForm.joinType === 2" label="邀请码" prop="inviteCode">
          <el-input v-model="createForm.inviteCode" placeholder="自定义邀请码（6-12 位）" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" class="red-confirm-btn" @click="handleCreate">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search, Reading, User, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getCourseList, getMyCourses, joinCourse, createCourse } from '@/api/course'
import type { CourseItem, CourseCreateReq } from '@/api/course'

const router = useRouter()
const authStore = useAuthStore()

// ───── 状态 ─────
const loading = ref(false)
const courseList = ref<(CourseItem & { _joining?: boolean })[]>([])
const total = ref(0)
const activeTab = ref<'all' | 'mine'>('all')
const searchKeyword = ref('')

// ───── 查询参数 ─────
const query = reactive({
  keyword: '',
  subjectArea: '' as string | undefined,
  joinType: undefined as number | undefined,
  status: undefined as number | undefined,
  pageNum: 1,
  pageSize: 12,
})

// ───── 加载课程 ─────
async function fetchList() {
  loading.value = true
  try {
    if (activeTab.value === 'mine') {
      const res = await getMyCourses()
      const raw = authStore.isTeacher
        ? [...(res.teaching ?? []), ...(res.assisting ?? [])]
        : (res.learning ?? [])
      // 将 MyCourseItem 映射为页面使用的结构格式
      const list = raw.map((c) => ({
        id: String(c.courseId ?? c.id ?? ''),
        courseName: c.courseName,
        description: '',
        cover: c.courseCover ?? c.cover ?? '',
        status: c.status ?? 0,
        joinType: 0,
        teacherId: '',
        teacherName: c.teacherName ?? '',
        memberCount: c.studentCount ?? c.memberCount ?? 0,
        subjectArea: c.subjectArea ?? '',
        auditStatus: 0,
        createdTime: c.createdTime ?? '',
      }))
      // 客户端关键词过滤
      const kw = searchKeyword.value.toLowerCase()
      courseList.value = kw ? list.filter((c) => c.courseName.toLowerCase().includes(kw)) : list
      total.value = courseList.value.length
    } else {
      query.keyword = searchKeyword.value
      const res = await getCourseList({
        ...query,
        subjectArea: query.subjectArea || undefined,
        joinType: query.joinType,
        status: query.status,
      })
      courseList.value = res.records
      total.value = res.total
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  fetchList()
}

function handleReset() {
  searchKeyword.value = ''
  Object.assign(query, { keyword: '', subjectArea: undefined, joinType: undefined, status: undefined, pageNum: 1 })
  fetchList()
}

function switchTab(tab: 'all' | 'mine') {
  activeTab.value = tab
  query.pageNum = 1
  fetchList()
}

// ───── 标签显示 ─────
function statusType(s: number): '' | 'info' | 'success' | 'warning' {
  return ({ 0: 'info', 1: 'success', 2: 'warning' } as Record<number, '' | 'info' | 'success' | 'warning'>)[s] ?? ''
}
function statusLabel(s: number): string {
  return ({ 0: '草稿', 1: '进行中', 2: '已归档' } as Record<number, string>)[s] ?? '未知'
}

// ───── 加入课程 ─────
async function handleJoin(course: CourseItem & { _joining?: boolean }) {
  course._joining = true
  try {
    await joinCourse(course.id)
    ElMessage.success('加入成功，快去学习吧！')
    router.push(`/course/${course.id}`)
  } finally {
    course._joining = false
  }
}

// ───── 创建课程 ─────
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()

const createForm = reactive<CourseCreateReq>({
  courseName: '',
  description: '',
  subjectArea: '',
  joinType: 0,
  inviteCode: '',
})

const createRules: FormRules = {
  courseName: [
    { required: true, message: '请输入课程名称', trigger: 'blur' },
    { max: 50, message: '课程名称不超过 50 个字符', trigger: 'blur' },
  ],
  joinType: [{ required: true, message: '请选择加入方式', trigger: 'change' }],
  inviteCode: [
    { required: true, message: '请设置邀请码', trigger: 'blur' },
    { min: 6, max: 12, message: '邀请码 6-12 位', trigger: 'blur' },
  ],
}

function resetCreateForm() {
  Object.assign(createForm, { courseName: '', description: '', subjectArea: '', joinType: 0, inviteCode: '' })
  createFormRef.value?.clearValidate()
}

async function handleCreate() {
  if (!(await createFormRef.value?.validate().catch(() => false))) return
  creating.value = true
  try {
    const courseId = await createCourse({
      ...createForm,
      subjectArea: createForm.subjectArea || undefined,
      inviteCode: createForm.joinType === 2 ? createForm.inviteCode : undefined,
    })
    ElMessage.success('课程创建成功')
    showCreateDialog.value = false
    router.push(`/course/${courseId}`)
  } finally {
    creating.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.course-list-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.create-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 8px !important;
}

/* ===== Tab 导航 ===== */
.tab-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tab-nav { display: flex; gap: 4px; background: #f5f5f5; padding: 4px; border-radius: 10px; }

.tab-item {
  padding: 7px 20px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 14px;
  color: #78909c;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}
.tab-item.active { background: #fff; color: #d32f2f; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

/* ===== 筛选卡片 ===== */
.filter-card { border-radius: 12px !important; }
:deep(.el-card__body) { padding: 14px 20px; }

/* ===== 课程网格 ===== */
.course-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  min-height: 200px;
}

.course-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  border: 1.5px solid #f5f5f5;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
}
.course-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(211,47,47,0.12);
  border-color: #ffcdd2;
}

.card-cover {
  position: relative;
  height: 130px;
  background: linear-gradient(135deg, #b71c1c, #ff5252);
  overflow: hidden;
}
.card-cover img { width: 100%; height: 100%; object-fit: cover; }
.cover-default { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.status-tag {
  position: absolute;
  top: 8px;
  right: 8px;
}

.card-body { padding: 14px; flex: 1; display: flex; flex-direction: column; }

.card-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 700;
  color: #263238;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-desc {
  margin: 0 0 10px;
  font-size: 12px;
  color: #90a4ae;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #78909c;
}

.card-teacher, .card-members {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-action { margin-top: 10px; }

.join-btn {
  width: 100%;
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 6px !important;
}

/* ===== 分页 ===== */
.pagination-wrap { display: flex; justify-content: center; padding: 8px 0; }

/* ===== 对话框确认按钮 ===== */
:deep(.red-confirm-btn) {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
}

@media (max-width: 1200px) { .course-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .course-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .course-grid { grid-template-columns: 1fr; } }
</style>
