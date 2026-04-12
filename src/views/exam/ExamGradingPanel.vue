<template>
  <div class="grading-page">
    <div class="grading-container">
      <!-- Header -->
      <div class="grading-header">
        <div class="header-left">
          <el-button :icon="ArrowLeft" circle @click="$router.back()" style="margin-right:12px;" />
          <div>
            <h1 class="header-title">交卷与批改</h1>
            <p class="header-sub">查看学生提交情况并进行人工评阅</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-label">已提交</span>
          <span class="stat-value">{{ totalSubmitted }}</span>
        </div>
      </div>

      <!-- Body -->
      <div class="grading-body">
        <!-- Left: Student List -->
        <div class="student-panel">
          <div class="panel-header">学生列表（{{ submittedList.length }} 人）</div>
          <div class="student-list">
            <el-empty
              v-if="submittedList.length === 0 && !listLoading"
              description="暂无学生提交记录，等待学生完成考试后再来批改吧"
              :image-size="120"
              style="padding: 40px 0;"
            />
            <div v-else-if="listLoading" style="padding: 40px; text-align:center;">
              <el-icon class="is-loading" style="font-size:24px;color:#999;"><Loading /></el-icon>
            </div>
            <div
              v-for="record in submittedList"
              :key="record.recordId"
              class="student-item"
              :class="{ active: selectedRecord?.recordId === record.recordId }"
              @click="selectStudent(record)"
            >
              <div class="student-name-row">
                <span class="student-name">{{ record.studentName }}</span>
                <el-tag size="small" :type="getStatusType(record.gradingStatus)">
                  {{ getStatusLabel(record.gradingStatus) }}
                </el-tag>
              </div>
              <div class="student-score-row">
                <span>总分：<strong style="color:#3b82f6">{{ record.totalScore || 0 }}</strong></span>
                <span v-if="record.gradingStatus === 2" style="color:#22c55e">批改完成</span>
                <span v-else-if="record.pendingCount > 0" style="color:#ef4444">待批改：{{ record.pendingCount }}</span>
                <span v-else style="color:#3b82f6">批改中</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Grading Area -->
        <div class="grading-panel">
          <template v-if="selectedRecord">
            <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span class="student-name" style="font-size:16px;">{{ selectedRecord.studentName }} 的答卷</span>
                <span style="margin-left:16px;color:#6b7280;font-size:14px;">
                  当前总分：<strong style="color:#dc2626;font-size:18px;">{{ selectedRecord.totalScore || 0 }}</strong>
                </span>
                <el-tag v-if="selectedRecord.gradingStatus === 2" type="success" size="small" style="margin-left:12px;">已发布</el-tag>
              </div>
              <el-button type="success" @click="handlePublishResult" :disabled="selectedRecord.gradingStatus !== 2 || selectedRecord.status === 2">发布成绩</el-button>
            </div>

            <div class="answer-list">
              <div v-for="(ans, idx) in selectedRecord.answers" :key="ans.answerId" class="answer-item">
                <div class="answer-meta">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="q-index">{{ idx + 1 }}</span>
                    <el-tag size="small">{{ getTypeName(ans.questionType) }}</el-tag>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:13px;color:#6b7280;">打分：</span>
                    <el-input-number
                      v-model="gradingForm[ans.answerId].score"
                      :max="ans.fullScore"
                      :min="0"
                      size="small"
                      controls-position="right"
                      @change="saveGrade(ans.answerId)"
                      :disabled="selectedRecord.status === 2"
                    />
                    <span style="color:#9ca3af;">/ {{ ans.fullScore }}</span>
                    <el-icon v-if="ans.isCorrect === true" color="#22c55e"><CircleCheck /></el-icon>
                    <el-icon v-else-if="ans.isCorrect === false" color="#ef4444"><CircleClose /></el-icon>
                  </div>
                </div>

                <div class="question-box" v-html="ans.questionContent"></div>

                <div class="answer-grid">
                  <div class="answer-box student-answer-box">
                    <div class="answer-box-title" style="color:#1d4ed8;">学生答案：</div>
                    <div class="answer-box-content">{{ formatAnswer(ans.userAnswer, ans.questionType) || '（未作答）' }}</div>
                  </div>
                  <div class="answer-box ref-answer-box">
                    <div class="answer-box-title" style="color:#15803d;">标准/参考答案：</div>
                    <div class="answer-box-content">{{ formatAnswer(ans.correctAnswer, ans.questionType) || '无' }}</div>
                  </div>
                </div>

                <el-input
                  v-model="gradingForm[ans.answerId].comment"
                  placeholder="输入评语（可选）..."
                  size="small"
                  style="margin-top:12px;"
                  @blur="saveGrade(ans.answerId)"
                  :disabled="selectedRecord.status === 2"
                >
                  <template #prepend>评语</template>
                </el-input>
              </div>
            </div>
          </template>
          <div v-else class="placeholder">
            <el-empty description="请从左侧选择一名学生开始批改" :image-size="100" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, CircleCheck, CircleClose, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/utils/request'

const route = useRoute()
const taskId = route.params.taskId

const submittedList = ref<any[]>([])
const totalSubmitted = ref(0)
const selectedRecord = ref<any>(null)
const gradingForm = reactive<Record<number, { score: number, comment: string }>>({})
const listLoading = ref(false)

async function fetchList() {
  listLoading.value = true
  try {
    const res = await axios.get(`/v1/grading/pending?taskId=${taskId}&pageSize=100`) as any
    // 拦截器已解包 res.data，直接取 list/records
    submittedList.value = res?.list || res?.records || []
    totalSubmitted.value = res?.total || submittedList.value.length
  } catch (err: any) {
    // 无数据时静默处理，不弹错误
    submittedList.value = []
    totalSubmitted.value = 0
  } finally {
    listLoading.value = false
  }
}

async function selectStudent(recordSummary: any) {
  try {
    const fullDetail = await axios.get(`/v1/grading/${recordSummary.recordId}`) as any
    fullDetail.answers?.forEach((ans: any) => {
      gradingForm[ans.answerId] = {
        score: ans.score || 0,
        comment: ans.comment || ''
      }
    })
    selectedRecord.value = fullDetail
  } catch (err) {
    ElMessage.error('加载详情失败')
  }
}

async function saveGrade(answerId: number) {
  const form = gradingForm[answerId]
  try {
    await axios.post('/v1/grading/grade', {
      answerId,
      score: form.score,
      comment: form.comment
    })
    const updated = await axios.get(`/v1/grading/${selectedRecord.value.recordId}`) as any
    selectedRecord.value.totalScore = updated.totalScore
    selectedRecord.value.gradingStatus = updated.gradingStatus
    selectedRecord.value.pendingCount = updated.pendingCount

    const inList = submittedList.value.find(r => r.recordId === selectedRecord.value.recordId)
    if (inList) {
      inList.totalScore = updated.totalScore
      inList.gradingStatus = updated.gradingStatus
      inList.pendingCount = updated.pendingCount
    }
  } catch (err) {
    ElMessage.error('打分失败，请重试')
  }
}

async function handlePublishResult() {
  await ElMessageBox.confirm('发布成绩后，学生将可查看最终得分及评语。确定发布吗？', '提示', { type: 'warning' })
  try {
    await axios.post(`/v1/grading/${selectedRecord.value.recordId}/publish`)
    ElMessage.success('成绩已发布')
    fetchList()
  } catch (err) {
    ElMessage.error('发布失败')
  }
}

function getStatusType(status: number) {
  return ({ 0: 'info', 1: 'warning', 2: 'success' } as any)[status] || 'info'
}
function getStatusLabel(status: number) {
  return ({ 0: '待提交', 1: '待批改', 2: '批改完成' } as any)[status] || '待处理'
}
function getTypeName(type: number) {
  return ({ 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' } as any)[type] || '未知'
}

function formatAnswer(val: string, type: number) {
  if (!val) return val
  if (type === 3) {
    if (val === 'A') return '正确'
    if (val === 'B') return '错误'
  }
  return val
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.grading-page {
  min-height: 100vh;
  background: #f1f5f9;
  padding: 24px;
}

.grading-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.grading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  border-radius: 16px;
  padding: 20px 28px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  border-left: 4px solid #dc2626;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.header-sub {
  font-size: 13px;
  color: #9ca3af;
  margin: 4px 0 0;
}

.stat-card {
  background: #f8fafc;
  padding: 10px 24px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-label { font-size: 12px; color: #9ca3af; }
.stat-value { font-size: 24px; font-weight: 700; color: #111827; }

/* Body */
.grading-body {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  height: calc(100vh - 180px);
}

/* Student Panel */
.student-panel, .grading-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  flex-shrink: 0;
}

.student-list {
  flex: 1;
  overflow-y: auto;
}

.student-item {
  padding: 14px 18px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
}
.student-item:hover { background: #eff6ff; }
.student-item.active {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.student-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.student-name { font-weight: 600; color: #1f2937; font-size: 14px; }

.student-score-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

/* Grading Panel */
.answer-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.answer-item {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 24px;
}
.answer-item:last-child { border-bottom: none; padding-bottom: 0; }

.answer-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.q-index {
  background: #1f2937;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.question-box {
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  margin-bottom: 12px;
  line-height: 1.6;
}

.answer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.answer-box {
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
}

.student-answer-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.ref-answer-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.answer-box-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 12px;
}

.answer-box-content {
  white-space: pre-wrap;
  color: #374151;
  line-height: 1.5;
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
