<template>
  <div class="courses-mgmt-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">课程管理</h2>
        <p class="page-desc">全站课程目录预览、查看详情与违规下架管理</p>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input v-model="query.keyword" placeholder="课程名称关键词" clearable :prefix-icon="Search" style="width:220px" @keyup.enter="handleSearch" @clear="handleSearch" />
        <el-select v-model="query.auditStatus" placeholder="审核状态" clearable style="width:130px" @change="handleSearch">
          <el-option label="待审核" :value="0" />
          <el-option label="已发布" :value="1" />
          <el-option label="已拒绝" :value="2" />
        </el-select>
        <el-button type="primary" class="red-btn" @click="handleSearch">搜索</el-button>
      </div>
    </el-card>

    <!-- 课程表格 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="courses" v-loading="loading" stripe>
        <el-table-column label="课程信息" min-width="250">
          <template #default="{ row }">
            <div class="course-info-cell">
              <el-image :src="row.cover || row.courseCover" class="course-cover-mini">
                <template #error><div class="image-slot"><el-icon><Picture /></el-icon></div></template>
              </el-image>
              <div class="course-text">
                <span class="course-name">{{ row.courseName }}</span>
                <span class="course-id">ID: {{ row.id }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="教师" prop="teacherName" width="120" />
        <el-table-column label="所属院校" prop="schoolName" min-width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="(['info','success','danger'] as const)[row.auditStatus] ?? 'info'"
              size="small"
            >{{ ['待审核','已发布','已拒绝'][row.auditStatus] || '草稿' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdTime" width="120">
          <template #default="{ row }">{{ row.createdTime?.slice(0,10) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="$router.push(`/course/${row.id}`)">查看详情</el-button>
            <el-button
              v-if="row.auditStatus === 1"
              text
              size="small"
              type="warning"
              @click="handleOffline(row)"
            >下架</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > query.pageSize"
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        background
        style="margin-top: 16px; justify-content: flex-end; display: flex"
        @change="fetchCourses"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Picture } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getCourseList, updateCourseStatus } from '@/api/course'
import type { CourseItem } from '@/api/course'

const router = useRouter()

const query = reactive({
  keyword: '',
  auditStatus: undefined as number | undefined,
  pageNum: 1,
  pageSize: 15
})

const loading = ref(false)
const courses = ref<CourseItem[]>([])
const total = ref(0)

async function fetchCourses() {
  loading.value = true
  try {
    const res = await getCourseList(query as any)
    courses.value = res?.list || res?.records || []
    total.value = res?.total ?? 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  fetchCourses()
}

/** 下架课程 */
async function handleOffline(row: CourseItem) {
  try {
    await ElMessageBox.confirm(
      `确定要下架课程《${row.courseName}》吗？下架后学生将无法搜索和加入该课程。`,
      '下架提示',
      { confirmButtonText: '确定下架', cancelButtonText: '取消', type: 'warning' }
    )
    // 根据后端实现，将 status 设为 0 (关闭/未发布)
    await updateCourseStatus(row.id, 0)
    ElMessage.success('课程已成功下架')
    fetchCourses()
  } catch (err) {
    //
  }
}

onMounted(fetchCourses)
</script>

<style scoped>
.courses-mgmt-page { display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.filter-card { border-radius: 14px !important; }
.filter-row  { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }

.table-card  { border-radius: 14px !important; }

.course-info-cell { display: flex; align-items: center; gap: 12px; }
.course-cover-mini { width: 80px; height: 45px; border-radius: 6px; flex-shrink: 0; object-fit: cover; }
.course-text { display: flex; flex-direction: column; gap: 2px; }
.course-name { font-size: 14px; font-weight: 600; color: #263238; }
.course-id { font-size: 11px; color: #90a4ae; }

.image-slot { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; background: #f5f7fa; color: #909399; font-size: 16px; }

.red-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important; color: #fff !important;
}
</style>
