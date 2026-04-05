<template>
  <div class="audit-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">审核中心</h2>
        <p class="page-desc">对平台内容进行人工审核，保障内容质量与合规性</p>
      </div>
      <div class="header-stats">
        <div class="hstat-item">
          <span class="hstat-num red">{{ pendingCount }}</span>
          <span class="hstat-label">待审核总数</span>
        </div>
        <div class="hstat-item">
          <span class="hstat-num green">{{ todayApproved }}</span>
          <span class="hstat-label">今日已通过</span>
        </div>
      </div>
    </div>

    <!-- 内容 Tab -->
    <el-card class="audit-card" shadow="never">
      <el-tabs v-model="activeTab" @tab-change="onTabSwitch">
        <el-tab-pane label="全部待处理" name="all" />
        <el-tab-pane label="课程审核" name="COURSE" />
        <el-tab-pane label="话题审核" name="POST" />
        <el-tab-pane label="评论审核" name="COMMENT" />
        <el-tab-pane label="资源审核" name="RESOURCE" />
        <el-tab-pane label="👁 审核历史" name="history" />
      </el-tabs>

      <!-- 待审核 / 历史 工具栏 -->
      <div class="toolbar">
        <!-- 风险等级筛选（仅待审核时可用） -->
        <el-select
          v-if="activeTab !== 'history'"
          v-model="pendingQuery.riskLevel"
          placeholder="风险等级"
          clearable
          style="width:120px"
          @change="fetchPending"
        >
          <el-option label="低风险" :value="1" />
          <el-option label="中风险" :value="2" />
          <el-option label="高风险" :value="3" />
        </el-select>

        <!-- 历史：结果筛选 -->
        <el-select
          v-if="activeTab === 'history'"
          v-model="historyQuery.auditResult"
          placeholder="审核结果"
          clearable
          style="width:120px"
          @change="fetchHistory"
        >
          <el-option label="通过" :value="1" />
          <el-option label="拒绝" :value="2" />
        </el-select>

        <div style="flex:1" />

        <!-- 批量审核按钮 -->
        <template v-if="activeTab !== 'history' && selectedIds.length">
          <el-button type="success" size="small" @click="batchApprove">批量通过 ({{ selectedIds.length }})</el-button>
          <el-button type="danger" size="small" @click="showBatchRejectDialog">批量拒绝</el-button>
        </template>
      </div>

      <!-- 待审核表格 -->
      <el-table
        v-if="activeTab !== 'history'"
        v-loading="loading"
        :data="pendingList"
        row-key="recordId"
        stripe
        @selection-change="handleSelection"
      >
        <el-table-column type="selection" width="44" />
        <el-table-column label="内容类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="contentTypeTagType(row.contentType)">{{ contentTypeLabel(row.contentType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容摘要" min-width="240">
          <template #default="{ row }">
            <div class="content-cell">
              <div class="content-title-row">
                <span class="content-title">{{ row.contentTitle }}</span>
                <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
              </div>
              <div v-if="row.contentPreview" class="content-preview">{{ row.contentPreview?.slice(0, 80) }}{{ row.contentPreview?.length > 80 ? '...' : '' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="100" prop="creatorName" />
        <el-table-column label="AI 风险" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.riskLevel)" size="small">{{ riskLabel(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="150">
          <template #default="{ row }">{{ row.createdTime?.replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="识别原因" min-width="140" prop="auditReason" show-overflow-tooltip />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="success" text size="small" @click="singleApprove(row)">通过</el-button>
            <el-button type="danger" text size="small" @click="showSingleReject(row)">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 历史记录表格 -->
      <el-table v-else v-loading="loading" :data="historyList" stripe>
        <el-table-column label="内容类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="contentTypeTagType(row.contentType)">{{ contentTypeLabel(row.contentType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容标题" prop="contentTitle" min-width="200" show-overflow-tooltip />
        <el-table-column label="提交者" width="100" prop="creatorName" />
        <el-table-column label="审核结果" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.auditResult === 1 ? 'success' : 'danger'" size="small">{{ row.auditResult === 1 ? '通过' : '拒绝' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核人" width="100" prop="auditorName" />
        <el-table-column label="审核时间" width="150">
          <template #default="{ row }">{{ row.auditTime?.replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="审核结论" prop="auditReason" min-width="140" show-overflow-tooltip />
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="activeTab === 'history' ? historyTotal : pendingTotal"
          :page-sizes="[15, 30, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @change="onPaginationChange"
        />
      </div>
    </el-card>

    <!-- 拒绝理由对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="填写拒绝理由" width="420px">
      <el-input v-model="rejectComment" type="textarea" :rows="3" placeholder="请说明拒绝原因（将告知提交者）" />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="auditing" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 内容详情预览对话框 -->
    <el-dialog v-model="detailVisible" title="内容详情预览" width="600px">
      <div v-if="selectedRecord" class="detail-container">
        <div class="detail-item">
          <div class="detail-label">标题</div>
          <div class="detail-value title">{{ selectedRecord.contentTitle }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">预览内容</div>
          <div class="detail-value content">{{ selectedRecord.contentPreview || '（无预览内容）' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">识别/审核原因</div>
          <div class="detail-value reason">{{ selectedRecord.auditReason || '—' }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPendingList, auditRecord, batchAudit, getAuditHistory } from '@/api/audit'
import type { AuditRecord, AuditPendingQuery, AuditHistoryQuery } from '@/api/audit'

// ───── Tab ─────
const activeTab = ref<'all' | 'COURSE' | 'POST' | 'COMMENT' | 'RESOURCE' | 'history'>('all')

function onTabSwitch(name: string) {
  // name 是新的 Tab 名称
  if (name === 'history') {
    historyQuery.pageNum = 1
    fetchHistory()
  } else {
    pendingQuery.pageNum = 1
    pendingQuery.contentType = name === 'all'
      ? undefined
      : name as AuditPendingQuery['contentType']
    fetchPending()
  }
}

function onPaginationChange() {
  if (activeTab.value === 'history') fetchHistory()
  else fetchPending()
}

// ───── 统计 ─────
const pendingCount = ref(0)
const todayApproved = ref(0)

// ───── 详情查看 ─────
const detailVisible = ref(false)
const selectedRecord = ref<AuditRecord | null>(null)
function viewDetail(row: AuditRecord) {
  selectedRecord.value = row
  detailVisible.value = true
}

// ───── 待审核 ─────
const loading = ref(false)
const pendingList = ref<AuditRecord[]>([])
const pendingTotal = ref(0)
const selectedIds = ref<string[]>([])
const pendingQuery = reactive<AuditPendingQuery>({
  pageNum: 1, pageSize: 15,
  contentType: undefined,
  riskLevel: undefined,
})

async function fetchPending() {
  loading.value = true
  try {
    const res = await getPendingList({ ...pendingQuery })
    pendingList.value = res?.list || res?.records || []
    pendingTotal.value = res?.total ?? 0
    // 如果没有按类型筛选，则同步更新顶部的待审核总数
    if (!pendingQuery.contentType) {
      pendingCount.value = res?.total ?? 0
    }
  } finally { loading.value = false }
}

function handleSelection(rows: AuditRecord[]) {
  selectedIds.value = rows.map((r) => r.recordId)
}

// ───── 单条通过 ─────
const auditing = ref(false)

async function singleApprove(row: AuditRecord) {
  auditing.value = true
  try {
    await auditRecord(row.recordId, { auditResult: 1 })
    ElMessage.success('审核已通过')
    pendingList.value = pendingList.value.filter((r) => r.recordId !== row.recordId)
    pendingTotal.value = Math.max(0, pendingTotal.value - 1)
    pendingCount.value = Math.max(0, pendingCount.value - 1)
    todayApproved.value++
  } finally { auditing.value = false }
}

// ───── 单条拒绝 ─────
const rejectDialogVisible = ref(false)
const rejectComment = ref('')
let rejectTargetId = ''
let isBatchReject = false

function showSingleReject(row: AuditRecord) {
  rejectTargetId = row.recordId
  isBatchReject = false
  rejectComment.value = ''
  rejectDialogVisible.value = true
}

function showBatchRejectDialog() {
  isBatchReject = true
  rejectComment.value = ''
  rejectDialogVisible.value = true
}

async function confirmReject() {
  if (!rejectComment.value.trim()) {
    ElMessage.warning('请填写拒绝理由')
    return
  }
  auditing.value = true
  try {
    if (isBatchReject) {
      const res = await batchAudit({ recordIds: selectedIds.value, auditResult: 2, auditReason: rejectComment.value })
      ElMessage.success(`批量拒绝：成功 ${res.successCount} 条`)
      pendingList.value = pendingList.value.filter((r) => !selectedIds.value.includes(r.recordId))
      const count = res.successCount
      pendingTotal.value = Math.max(0, pendingTotal.value - count)
      pendingCount.value = Math.max(0, pendingCount.value - count)
    } else {
      await auditRecord(rejectTargetId, { auditResult: 2, auditReason: rejectComment.value })
      ElMessage.success('审核已拒绝')
      pendingList.value = pendingList.value.filter((r) => r.recordId !== rejectTargetId)
      pendingTotal.value = Math.max(0, pendingTotal.value - 1)
      pendingCount.value = Math.max(0, pendingCount.value - 1)
    }
    rejectDialogVisible.value = false
  } finally { auditing.value = false }
}

// ───── 批量通过 ─────
async function batchApprove() {
  auditing.value = true
  try {
    const res = await batchAudit({ recordIds: selectedIds.value, auditResult: 1 })
    ElMessage.success(`批量通过：成功 ${res.successCount} 条`)
    pendingList.value = pendingList.value.filter((r) => !selectedIds.value.includes(r.recordId))
    const count = res.successCount
    pendingTotal.value = Math.max(0, pendingTotal.value - count)
    pendingCount.value = Math.max(0, pendingCount.value - count)
    todayApproved.value += count
    selectedIds.value = []
  } finally { auditing.value = false }
}

// ───── 历史记录 ─────
const historyList = ref<AuditRecord[]>([])
const historyTotal = ref(0)
const historyQuery = reactive<AuditHistoryQuery>({ pageNum: 1, pageSize: 15, auditResult: undefined })

async function fetchHistory() {
  loading.value = true
  try {
    const res = await getAuditHistory(historyQuery)
    historyList.value = res?.list || res?.records || []
    historyTotal.value = res?.total ?? 0
  } finally { loading.value = false }
}

// ───── 分页计算属性 ─────
const currentPage = computed({
  get: () => (activeTab.value === 'history' ? historyQuery.pageNum! : pendingQuery.pageNum!),
  set: (val) => {
    if (activeTab.value === 'history') historyQuery.pageNum = val
    else pendingQuery.pageNum = val
  }
})

const pageSize = computed({
  get: () => (activeTab.value === 'history' ? historyQuery.pageSize! : pendingQuery.pageSize!),
  set: (val) => {
    if (activeTab.value === 'history') historyQuery.pageSize = val
    else pendingQuery.pageSize = val
  }
})

// ───── 辅助函数 ─────
function contentTypeLabel(t: string): string { return { COURSE: '课程', POST: '话题', COMMENT: '评论', RESOURCE: '资源' }[t] ?? t }
function contentTypeTagType(t: string): 'primary' | 'info' | 'success' | 'warning' {
  return ({ COURSE: 'primary', POST: 'success', COMMENT: 'info', RESOURCE: 'warning' } as Record<string, 'primary' | 'info' | 'success' | 'warning'>)[t] ?? 'info'
}
function riskLabel(l: number): string { return { 1: '低', 2: '中', 3: '高' }[l] ?? '—' }
function riskTagType(l: number): 'info' | 'success' | 'warning' | 'danger' {
  return ({ 1: 'success', 2: 'warning', 3: 'danger' } as Record<number, 'info' | 'success' | 'warning' | 'danger'>)[l] ?? 'info'
}

onMounted(() => {
  fetchPending()
})
</script>

<style scoped>
.audit-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.header-stats { display: flex; gap: 24px; background: #fff; padding: 12px 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }

.hstat-item { text-align: center; }
.hstat-num  { font-size: 26px; font-weight: 800; display: block; line-height: 1.2; }
.hstat-num.red   { color: #d32f2f; }
.hstat-num.green { color: #388e3c; }
.hstat-label { font-size: 12px; color: #90a4ae; margin-top: 2px; }

.audit-card { border-radius: 16px !important; border: none !important; box-shadow: 0 4px 16px rgba(0,0,0,0.04) !important; }
:deep(.el-card__body) { padding: 0 20px 20px; }
:deep(.el-tabs__item.is-active) { color: #d32f2f; font-weight: 600; }
:deep(.el-tabs__active-bar) { background: #d32f2f; height: 3px; border-radius: 3px; }
:deep(.el-tabs__header) { margin-bottom: 20px; }

.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }

.content-cell { display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
.content-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.content-title  { font-size: 14px; font-weight: 600; color: #263238; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.content-preview{ font-size: 12px; color: #78909c; line-height: 1.5; background: #f8f9fa; padding: 4px 8px; border-radius: 4px; }

.pagination-wrap { display: flex; justify-content: flex-end; padding-top: 20px; }

/* 详情对话框样式 */
.detail-container { display: flex; flex-direction: column; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 6px; }
.detail-label { font-size: 12px; font-weight: 700; color: #90a4ae; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-value { font-size: 14px; color: #37474f; line-height: 1.6; }
.detail-value.title { font-size: 16px; font-weight: 700; color: #263238; }
.detail-value.content { background: #f5f7f9; padding: 12px; border-radius: 8px; max-height: 300px; overflow-y: auto; border: 1px solid #edf1f4; white-space: pre-wrap; }
.detail-value.reason { color: #d32f2f; font-weight: 500; }
</style>
