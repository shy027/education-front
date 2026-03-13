<template>
  <div class="student-literacy-list">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">学生素养看板</h2>
        <p class="page-desc">全校学生素养得分概览，支持按课程筛选及排名查看</p>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="query" inline size="default">
        <el-form-item label="筛选范围">
          <el-select v-model="query.courseId" placeholder="选择范围" style="width: 180px">
            <el-option label="全校总榜 (全局)" value="0" />
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
        
        <el-table-column label="用户ID / 姓名" min-width="150">
          <template #default="{ row }">
            <div class="user-info">
              <span class="uid">#{{ row.userId }}</span>
              <!-- 这里可以联查用户姓名，目前展示 ID -->
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
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getProfileList } from '@/api/report'

const router = useRouter()
const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const courseOptions = ref<any[]>([]) // 可以从 api 获取已发布的课程列表

const query = reactive({
  current: 1,
  size: 10,
  courseId: '0' // 默认全局榜单
})

// ───── 加载数据 ─────
async function fetchList() {
  loading.value = true
  try {
    const res = await getProfileList(query)
    tableData.value = res.records || []
    total.value = res.total
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
  fetchList()
}

function handleViewDetail(row: any) {
  // 跳转到学生报告页面 (复用现有的详情组件，或新开管理员视图)
  router.push({
    path: '/admin/student-literacy-detail',
    query: { userId: row.userId, courseId: row.courseId }
  })
}

// ───── 工具 ─────
function levelType(level: string) {
  if (level === '优秀') return 'success'
  if (level === '良好') return ''
  if (level === '合格') return 'warning'
  return 'info'
}

function formatDateTime(time: string) {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 16)
}

onMounted(fetchList)
</script>

<style scoped>
.student-literacy-list { padding: 4px; }
.page-header { margin-bottom: 20px; }
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

.trend-text { font-size: 12px; font-weight: 600; }
.trend-text.up { color: #43a047; }
.trend-text.down { color: #e53935; }
.trend-text.stable { color: #fb8c00; }

.time { font-size: 12px; color: #90a4ae; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
</style>
