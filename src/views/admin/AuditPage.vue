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
          <span class="hstat-label">待审核</span>
        </div>
        <div class="hstat-item">
          <span class="hstat-num green">{{ todayApproved }}</span>
          <span class="hstat-label">今日通过</span>
        </div>
      </div>
    </div>

    <!-- 内容 Tab -->
    <el-card class="audit-card" shadow="never">
      <el-tabs v-model="activeTab" @tab-click="onTabSwitch">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="课件" name="COURSEWARE" />
        <el-tab-pane label="讨论话题" name="POST" />
        <el-tab-pane label="讨论评论" name="COMMENT" />
        <el-tab-pane label="资源" name="RESOURCE" />
        <el-tab-pane label="👁 历史记录" name="history" />
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
        row-key="id"
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
              <div class="content-title">{{ row.contentTitle }}</div>
              <div v-if="row.contentPreview" class="content-preview">{{ row.contentPreview?.slice(0, 60) }}...</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提交者" width="100" prop="submitterName" />
        <el-table-column label="AI 风险" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.riskLevel)" size="small">{{ riskLabel(row.riskLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="150">
          <template #default="{ row }">{{ row.submittedTime?.slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="AI 识别原因" min-width="140" prop="riskReason" show-overflow-tooltip />
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
        <el-table-column label="提交者" width="100" prop="submitterName" />
        <el-table-column label="审核结果" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '通过' : '拒绝' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核人" width="100" prop="auditorName" />
        <el-table-column label="审核时间" width="150">
          <template #default="{ row }">{{ row.auditTime?.slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="理由" prop="auditComment" min-width="140" show-overflow-tooltip />
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="activeTab === 'history' ? historyQuery.pageNum! : pendingQuery.pageNum!"
          v-model:page-size="activeTab === 'history' ? historyQuery.pageSize! : pendingQuery.pageSize!"
          :total="activeTab === 'history' ? historyTotal : pendingTotal"
          layout="total, prev, pager, next"
          background
          @change="activeTab === 'history' ? fetchHistory() : fetchPending()"
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPendingList, auditRecord, batchAudit, getAuditHistory } from '@/api/audit'
import type { AuditRecord, AuditPendingQuery, AuditHistoryQuery } from '@/api/audit'

// ───── Tab ─────
const activeTab = ref<'all' | 'COURSEWARE' | 'POST' | 'COMMENT' | 'RESOURCE' | 'history'>('all')

function onTabSwitch() {
  if (activeTab.value === 'history') {
    historyQuery.pageNum = 1
    fetchHistory()
  } else {
    pendingQuery.pageNum = 1
    fetchPending()
  }
}

// ───── 统计 ─────
const pendingCount = ref(0)
const todayApproved = ref(0)

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
    const contentType = activeTab.value === 'all' || activeTab.value === 'history'
      ? undefined
      : activeTab.value as AuditPendingQuery['contentType']
    const res = await getPendingList({ ...pendingQuery, contentType })
    pendingList.value = res?.records || []
    pendingTotal.value = res?.total ?? 0
    if (activeTab.value === 'all') pendingCount.value = res?.total ?? 0
  } finally { loading.value = false }
}

function handleSelection(rows: AuditRecord[]) {
  selectedIds.value = rows.map((r) => r.id)
}

// ───── 单条通过 ─────
const auditing = ref(false)

async function singleApprove(row: AuditRecord) {
  auditing.value = true
  try {
    await auditRecord(row.id, { auditResult: 1 })
    ElMessage.success('已通过')
    pendingList.value = pendingList.value.filter((r) => r.id !== row.id)
    pendingTotal.value--
    todayApproved.value++
  } finally { auditing.value = false }
}

// ───── 单条拒绝 ─────
const rejectDialogVisible = ref(false)
const rejectComment = ref('')
let rejectTargetId = ''
let isBatchReject = false

function showSingleReject(row: AuditRecord) {
  rejectTargetId = row.id
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
  auditing.value = true
  try {
    if (isBatchReject) {
      const res = await batchAudit({ recordIds: selectedIds.value, auditResult: 2, auditComment: rejectComment.value })
      ElMessage.success(`批量拒绝：成功 ${res.successCount} 条`)
      pendingList.value = pendingList.value.filter((r) => !selectedIds.value.includes(r.id))
    } else {
      await auditRecord(rejectTargetId, { auditResult: 2, auditComment: rejectComment.value })
      ElMessage.success('已拒绝')
      pendingList.value = pendingList.value.filter((r) => r.id !== rejectTargetId)
    }
    rejectDialogVisible.value = false
    pendingTotal.value = Math.max(0, pendingTotal.value - (isBatchReject ? selectedIds.value.length : 1))
  } finally { auditing.value = false }
}

// ───── 批量通过 ─────
async function batchApprove() {
  const res = await batchAudit({ recordIds: selectedIds.value, auditResult: 1 })
  ElMessage.success(`批量通过：成功 ${res.successCount} 条`)
  pendingList.value = pendingList.value.filter((r) => !selectedIds.value.includes(r.id))
  todayApproved.value += res.successCount
  selectedIds.value = []
}

// ───── 历史记录 ─────
const historyList = ref<AuditRecord[]>([])
const historyTotal = ref(0)
const historyQuery = reactive<AuditHistoryQuery>({ pageNum: 1, pageSize: 15, auditResult: undefined })

async function fetchHistory() {
  loading.value = true
  try {
    const res = await getAuditHistory(historyQuery)
    historyList.value = res?.records || []
    historyTotal.value = res?.total ?? 0
  } finally { loading.value = false }
}

// ───── 辅助函数 ─────
function contentTypeLabel(t: string): string { return { COURSEWARE: '课件', POST: '话题', COMMENT: '评论', RESOURCE: '资源' }[t] ?? t }
function contentTypeTagType(t: string): '' | 'info' | 'success' | 'warning' { return ({ COURSEWARE: '', POST: 'success', COMMENT: 'info', RESOURCE: 'warning' } as Record<string, '' | 'info' | 'success' | 'warning'>)[t] ?? 'info' }
function riskLabel(l: number): string { return { 1: '低', 2: '中', 3: '高' }[l] ?? '—' }
function riskTagType(l: number): '' | 'success' | 'warning' | 'danger' { return ({ 1: 'success', 2: 'warning', 3: 'danger' } as Record<number, '' | 'success' | 'warning' | 'danger'>)[l] ?? '' }

onMounted(fetchPending)
</script>

<style scoped>
.audit-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.header-stats { display: flex; gap: 20px; }

.hstat-item { text-align: center; }
.hstat-num  { font-size: 28px; font-weight: 800; display: block; line-height: 1; }
.hstat-num.red   { color: #d32f2f; }
.hstat-num.green { color: #388e3c; }
.hstat-label { font-size: 12px; color: #90a4ae; }

.audit-card { border-radius: 16px !important; }
:deep(.el-card__body) { padding: 0 20px 20px; }
:deep(.el-tabs__item.is-active) { color: #d32f2f; }
:deep(.el-tabs__active-bar) { background: #d32f2f; }

.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }

.content-cell { display: flex; flex-direction: column; gap: 3px; }
.content-title  { font-size: 14px; font-weight: 600; color: #263238; }
.content-preview{ font-size: 12px; color: #90a4ae; }

.pagination-wrap { display: flex; justify-content: flex-end; padding-top: 16px; }
</style>
