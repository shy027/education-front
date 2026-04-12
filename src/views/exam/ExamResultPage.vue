<template>
  <div class="result-page" v-loading="loading">
    <div v-if="record" class="result-container">
      <!-- Header / Summary Card -->
      <div class="summary-card animate-slide-up">
        <div class="summary-left">
          <el-button :icon="ArrowLeft" circle @click="$router.back()" class="back-btn" />
          <div class="exam-info">
            <h1 class="exam-title">考试结果报告</h1>
            <p class="exam-date">提交时间：{{ formatDate(record.submitTime) }}</p>
          </div>
        </div>
        
        <div class="score-section">
          <div class="score-circle">
            <span class="score-value">{{ record.totalScore || 0 }}</span>
            <span class="score-total">/ {{ record.taskTotalScore || 100 }}</span>
          </div>
          <div class="score-label">最终得分</div>
        </div>
      </div>

      <!-- Statistics Row -->
      <div class="stats-row animate-slide-up" style="animation-delay: 0.1s; grid-template-columns: 1fr 1fr;">
        <div class="stat-item">
          <div class="stat-icon correct"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-content">
            <div class="stat-val">{{ correctCount }}</div>
            <div class="stat-label">正确题目</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon incorrect"><el-icon><CircleClose /></el-icon></div>
          <div class="stat-content">
            <div class="stat-val">{{ incorrectCount }}</div>
            <div class="stat-label">错误题目</div>
          </div>
        </div>
      </div>

      <!-- Question List -->
      <div class="answer-list animate-slide-up" style="animation-delay: 0.2s;">
        <h2 class="section-title">答解详情</h2>
        
        <div v-for="(ans, idx) in record.answers" :key="ans.answerId" class="answer-card">
          <div class="card-header">
            <div class="q-meta">
              <span class="q-index">#{{ idx + 1 }}</span>
              <el-tag size="small" effect="plain">{{ getTypeName(ans.questionType) }}</el-tag>
            </div>
            <div class="q-score">
              得分：<span :class="ans.score > 0 ? 'text-success' : 'text-danger'">{{ ans.score || 0 }}</span> / {{ ans.fullScore }}
            </div>
          </div>

          <div class="question-content" v-html="ans.questionContent"></div>

          <div class="answer-comparison">
            <div class="answer-box user-answer" :class="{ 'is-correct': ans.isCorrect, 'is-incorrect': ans.isCorrect === false }">
              <div class="box-label">您的回答：</div>
              <div class="box-content">{{ formatAnswer(ans.userAnswer, ans.questionType) || '（未作答）' }}</div>
              <el-icon v-if="ans.isCorrect" class="status-icon"><SuccessFilled /></el-icon>
              <el-icon v-else-if="ans.isCorrect === false" class="status-icon"><CircleCloseFilled /></el-icon>
            </div>
            
            <div v-if="record.showAnswer !== 0" class="answer-box ref-answer">
              <div class="box-label">标准答案：</div>
              <div class="box-content">{{ formatAnswer(ans.correctAnswer, ans.questionType) || '无' }}</div>
            </div>
          </div>

          <div v-if="ans.comment" class="teacher-comment">
            <div class="comment-label"><el-icon><ChatDotRound /></el-icon> 教师评语：</div>
            <div class="comment-content">{{ ans.comment }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <el-empty v-else-if="!loading" description="未找到相关答题记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, CircleCheck, CircleClose, Loading, 
  SuccessFilled, CircleCloseFilled, ChatDotRound 
} from '@element-plus/icons-vue'
import axios from '@/utils/request'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const recordId = route.params.recordId
const loading = ref(false)
const record = ref<any>(null)

async function fetchResult() {
  loading.value = true
  try {
    const res = await axios.get(`/v1/grading/${recordId}`) as any
    record.value = res
  } catch (err: any) {
    ElMessage.error(err.message || '加载成绩失败')
    router.back()
  } finally {
    loading.value = false
  }
}

const correctCount = computed(() => record.value?.answers?.filter((a: any) => a.isCorrect === true).length || 0)
const incorrectCount = computed(() => record.value?.answers?.filter((a: any) => a.isCorrect === false).length || 0)
const pendingCount = computed(() => record.value?.answers?.filter((a: any) => a.score === null || a.score === undefined).length || 0)

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

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  if (!recordId) {
    ElMessage.error('参数错误')
    router.back()
    return
  }
  fetchResult()
})
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 40px 20px;
}

.result-container {
  max-width: 900px;
  margin: 0 auto;
}

/* Summary Card */
.summary-card {
  background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
  border-radius: 24px;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.05);
  margin-bottom: 24px;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.exam-title {
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.exam-date {
  font-size: 14px;
  color: #64748b;
  margin: 4px 0 0;
}

.score-section {
  text-align: center;
}

.score-circle {
  background: #fff;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 6px solid #d32f2f;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.2);
}

.score-value {
  font-size: 32px;
  font-weight: 900;
  color: #d32f2f;
  line-height: 1;
}

.score-total {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.score-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-top: 8px;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-item {
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-icon.correct { background: #f0fdf4; color: #16a34a; }
.stat-icon.incorrect { background: #fef2f2; color: #dc2626; }
.stat-icon.pending { background: #eff6ff; color: #2563eb; }

.stat-val {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

/* Question List */
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #334155;
  margin: 0 0 16px;
  padding-left: 4px;
}

.answer-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.q-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.q-index {
  font-weight: 800;
  color: #d32f2f;
  font-size: 16px;
}

.q-score {
  font-size: 13px;
  color: #64748b;
}

.text-success { color: #16a34a; font-weight: 700; }
.text-danger { color: #dc2626; font-weight: 700; }

.question-content {
  font-size: 15px;
  line-height: 1.6;
  color: #334155;
  margin-bottom: 20px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.answer-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.answer-box {
  padding: 16px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.box-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.box-content {
  font-size: 14px;
  font-weight: 500;
}

.user-answer {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.user-answer.is-correct {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.user-answer.is-incorrect {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.ref-answer {
  background: #fefce8;
  border: 1px solid #fef08a;
  color: #854d0e;
}

.status-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
  opacity: 0.8;
}

.teacher-comment {
  margin-top: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
}

.comment-label {
  font-size: 12px;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.comment-content {
  font-size: 13px;
  color: #334155;
}

/* Animations */
.animate-slide-up {
  animation: slideUp 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
