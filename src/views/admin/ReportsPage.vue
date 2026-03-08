<template>
  <div class="reports-mgmt-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">报告管理</h2>
        <p class="page-desc">查看所有课程报告生成状态和下载</p>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input v-model="query.courseId" placeholder="课程ID" clearable style="width:160px" />
        <el-select v-model="query.reportType" placeholder="报告类型" clearable style="width:140px">
          <el-option label="课程报告" :value="1" />
          <el-option label="学校报告" :value="2" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" :shortcuts="dateShortcuts" range-separator="~" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:260px" @change="onDateChange" />
        <el-button type="primary" class="red-btn" @click="handleSearch">搜索</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </el-card>

    <!-- 报告列表表格 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="reports" v-loading="loading" stripe>
        <el-table-column label="报告ID" prop="id" width="100" />
        <el-table-column label="课程名" prop="courseName" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.reportType === 1 ? 'primary' : 'warning'" size="small">
              {{ row.reportType === 1 ? '课程报告' : '学校报告' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="['info','warning','success','danger'][row.status] as 'info'|'warning'|'success'|'danger'" size="small">
              {{ ['等待中','生成中','已完成','失败'][row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建者" prop="generatorName" width="120" />
        <el-table-column label="创建时间" prop="createdTime" width="160">
          <template #default="{ row }">{{ row.createdTime?.slice(0,16) }}</template>
        </el-table-column>
        <el-table-column label="完成时间" prop="finishedTime" width="160">
          <template #default="{ row }">{{ row.finishedTime?.slice(0,16) || '—' }}</template>
        </el-table-column>
        <el-table-column label="下载次数" prop="downloadCount" width="90" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" type="primary" :disabled="row.status !== 2" @click="handleDownload(row.id)">下载</el-button>
            <el-popconfirm title="确定删除该报告？" @confirm="deleteReportById(row.id)">
              <template #reference>
                <el-button text size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
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
        @change="fetchReports"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAllReportList, getReportDownloadUrl, deleteReport } from '@/api/report'
import type { ReportDTO } from '@/api/report'

const query = reactive<{
  courseId?: string; reportType?: number;
  startTime?: string; endTime?: string;
  pageNum: number; pageSize: number;
}>({ pageNum: 1, pageSize: 15 })

const loading = ref(false)
const reports = ref<ReportDTO[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | null>(null)

const dateShortcuts = [
  { text: '最近一周', value: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate()-6); return [s, e] } },
  { text: '最近30天', value: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate()-29); return [s, e] } },
]

function onDateChange(val: [string, string] | null) {
  query.startTime = val?.[0] ?? undefined
  query.endTime   = val?.[1] ?? undefined
}

async function fetchReports() {
  loading.value = true
  try {
    const res = await getAllReportList(query)
    reports.value = res?.records || []
    total.value = res?.total ?? 0
  } finally { loading.value = false }
}

function handleSearch() { query.pageNum = 1; fetchReports() }

function resetFilter() {
  query.courseId = undefined
  query.reportType = undefined
  query.startTime = undefined
  query.endTime = undefined
  dateRange.value = null
  handleSearch()
}

async function handleDownload(reportId: string) {
  const url = await getReportDownloadUrl(reportId)
  window.open(url, '_blank')
}

async function deleteReportById(reportId: string) {
  await deleteReport(reportId)
  ElMessage.success('已删除')
  fetchReports()
}

onMounted(fetchReports)
</script>

<style scoped>
.reports-mgmt-page { display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }
.filter-card { border-radius: 14px !important; }
.filter-row  { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.table-card  { border-radius: 14px !important; }
.red-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important; color: #fff !important;
}
</style>
