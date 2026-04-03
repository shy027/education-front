<template>
  <div class="student-literacy-list">
    <!-- 页头 -->
    <div class="page-header">
      <el-button v-if="isCourseView" :icon="ArrowLeft" circle @click="router.back()" class="back-btn" />
      <div>
        <h2 class="page-title">{{ isCourseView ? '课程学生素养详情' : '学生素养看板' }}</h2>
        <p class="page-desc">{{ isCourseView ? '查看当前课程下所有学生的素养评分与各维度表现' : '全校学生素养得分概览，支持按课程筛选及排名查看' }}</p>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="query" inline size="default">
        <el-form-item label="所属学校" v-if="authStore.isAdmin">
          <el-select v-model="query.schoolId" placeholder="全部学校" clearable style="width: 160px" @change="handleSchoolChange">
            <el-option 
              v-for="s in schoolList" 
              :key="s.id" 
              :label="s.schoolName" 
              :value="s.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="学院">
          <el-select 
            v-model="query.department" 
            placeholder="全部学院" 
            clearable 
            :disabled="!query.schoolId"
            style="width: 160px" 
            @change="handleDeptChange"
          >
            <el-option v-for="d in departmentOptions" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item label="班级">
          <el-select 
            v-model="query.className" 
            placeholder="全部班级" 
            clearable 
            :disabled="!query.department"
            style="width: 140px"
          >
            <el-option v-for="c in classOptions" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程范围">
          <el-select v-model="query.courseId" placeholder="全部课程" :disabled="isCourseView" style="width: 160px">
            <el-option label="全站/全局" value="0" />
            <el-option 
              v-for="c in courseOptions" 
              :key="c.id" 
              :label="c.courseName" 
              :value="c.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据列表 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="tableData" stripe border style="width: 100%">
        <el-table-column label="排名" width="70" align="center">
          <template #default="{ $index }">
            <div :class="['rank-badge', $index < 3 ? 'top-' + ($index + 1) : '']">
              {{ (query.current - 1) * query.size + $index + 1 }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="用户 / 姓名" min-width="140">
          <template #default="{ row }">
            <div class="user-info-cell">
              <span class="user-name">{{ userMap[row.userId]?.realName || '未知用户' }}</span>
              <span class="user-id">@{{ userMap[row.userId]?.username || row.userId }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="totalScore" label="综合得分" width="100" sortable align="center">
          <template #default="{ row }">
            <span class="score-text">{{ row.totalScore }}</span>
          </template>
        </el-table-column>

        <el-table-column label="等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small" effect="dark">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="近期趋势" width="100" align="center">
          <template #default="{ row }">
            <span :class="['trend-text', row.growthTrend === '上升' ? 'up' : row.growthTrend === '下降' ? 'down' : 'stable']">
              {{ row.growthTrend === '上升' ? '↑' : row.growthTrend === '下降' ? '↓' : '→' }} {{ row.growthTrend }}
            </span>
          </template>
        </el-table-column>

        <el-table-column v-for="i in 6" :key="i" :label="'D'+i" width="70" align="center">
          <template #default="{ row }">
            <span class="dim-score">{{ row['dimension' + i + 'Score'] }}</span>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" width="160" align="center">
          <template #default="{ row }">
            <span class="time">{{ formatDateTime(row.updatedTime) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">查看报告</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSearch"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, Refresh, ArrowLeft } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { getProfileList } from '@/api/report'
import { getSchoolList, getDepartments, getClasses } from '@/api/school'
import { getPublishedCourses } from '@/api/course'
import { batchGetUsers } from '@/api/user'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isCourseView = computed(() => !!route.query.courseId)
const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const courseOptions = ref<any[]>([]) // 可以从 api 获取已发布的课程列表

const query = reactive({
  current: 1,
  size: 10,
  courseId: '0',
  schoolId: undefined as string | undefined,
  department: undefined as string | undefined,
  className: undefined as string | undefined
})

const schoolList = ref<any[]>([])
const departmentOptions = ref<string[]>([])
const classOptions = ref<string[]>([])
const userMap = ref<Record<string, any>>({})

// ───── 加载数据 ─────
async function fetchList() {
  loading.value = true
  try {
    const res = await getProfileList(query)
    const list = res.list || res.records || []
    tableData.value = list
    total.value = res.total || 0
    
    // 批量获取用户名
    if (list.length > 0) {
      const uids = list.map((v: any) => v.userId)
      const users = await batchGetUsers(uids)
      userMap.value = { ...userMap.value, ...users }
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.current = 1
  fetchList()
}

function handleReset() {
  query.current = 1
  query.size = 10
  query.courseId = '0'
  query.schoolId = (authStore.isSchoolLeader && authStore.userInfo?.schoolId) 
    ? String(authStore.userInfo.schoolId) 
    : undefined
  query.department = undefined
  query.className = undefined
  departmentOptions.value = []
  classOptions.value = []
  fetchList()
}

// ───── 联动逻辑 ─────
async function fetchSchools() {
  const res = await getSchoolList({ pageNum: 1, pageSize: 100 })
  schoolList.value = res.list || []
}

async function handleSchoolChange() {
  query.department = undefined
  query.className = undefined
  departmentOptions.value = []
  classOptions.value = []
  if (query.schoolId) {
    departmentOptions.value = await getDepartments(query.schoolId)
  }
}

async function handleDeptChange() {
  query.className = undefined
  classOptions.value = []
  if (query.schoolId && query.department) {
    classOptions.value = await getClasses(query.schoolId, query.department)
  }
}

async function fetchCourses() {
  try {
    const res = await getPublishedCourses()
    courseOptions.value = res || []
  } catch (e) {
    console.error('加载课程列表失败', e)
  }
}

function handleViewDetail(row: any) {
  // 跳转到素养报告详情页 (ReportPage.vue 现已集成管理员看学生模式)
  router.push({
    path: '/report',
    query: { 
      userId: row.userId, 
      courseId: row.courseId || '0',
      userName: userMap.value[row.userId]?.realName || '学生'
    }
  })
}

// ───── 工具 ─────
function levelType(level: string) {
  if (level === '优秀') return 'success'
  if (level === '良好') return 'primary'
  if (level === '合格') return 'warning'
  return 'info'
}

function formatDateTime(time: string) {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 16)
}

onMounted(async () => {
  if (route.query.courseId) {
    query.courseId = String(route.query.courseId)
  }
  // 校领导初始化锁定学校
  if (authStore.isSchoolLeader && authStore.userInfo?.schoolId) {
    query.schoolId = String(authStore.userInfo.schoolId)
    // 联动加载院系
    handleSchoolChange()
  }
  
  fetchList()
  fetchSchools()
  fetchCourses()
})
</script>

<style scoped>
.student-literacy-list { padding: 4px; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.back-btn { font-size: 18px; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #d32f2f; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.filter-card { border-radius: 12px; margin-bottom: 20px; }
.table-card { border-radius: 12px; }

.rank-badge {
  width: 24px; height: 24px; line-height: 24px;
  border-radius: 50%; background: #eceff1;
  color: #546e7a; font-size: 12px; font-weight: 700;
  margin: 0 auto;
}
.rank-badge.top-1 { background: #ffd700; color: #fff; }
.rank-badge.top-2 { background: #c0c0c0; color: #fff; }
.rank-badge.top-3 { background: #cd7f32; color: #fff; }

.score-text { font-weight: 700; color: #d32f2f; font-size: 15px; }
.dim-score { color: #546e7a; font-size: 12px; }

.user-info-cell { display: flex; flex-direction: column; }
.user-name { font-weight: 600; color: #263238; font-size: 14px; }
.user-id { font-size: 12px; color: #90a4ae; }

.trend-text { font-size: 12px; font-weight: 600; }
.trend-text.up { color: #43a047; }
.trend-text.down { color: #e53935; }
.trend-text.stable { color: #fb8c00; }

.time { font-size: 12px; color: #90a4ae; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
</style>
