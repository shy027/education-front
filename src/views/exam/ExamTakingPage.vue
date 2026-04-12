<template>
  <div class="exam-taking-page" v-loading="loading">
    <!-- Header -->
    <header class="exam-header">
      <div class="exam-header-content">
        <div class="header-left">
          <el-button icon="ArrowLeft" circle @click="handleExit" />
          <h1 class="exam-title">{{ paper?.title || '在线考试' }}</h1>
        </div>
        <div class="header-right">
          <div class="timer-box" :class="{ 'timer-warning': timeLeft < 300 && !isUnlimited }">
            <el-icon><Timer /></el-icon>
            <span class="timer-text">{{ isUnlimited && timeLeft > 86400 ? '不限时' : formatTime(timeLeft) }}</span>
          </div>
          <el-button type="primary" size="large" @click="handleSubmit">提交试卷</el-button>
        </div>
      </div>
    </header>

    <main class="exam-main">
      <div class="exam-container">
        <!-- Question List / Navigation -->
        <aside class="exam-nav shadow-sm">
          <div class="nav-header">答题卡</div>
          <div class="nav-body">
            <div 
              v-for="(q, index) in questions" 
              :key="q.id" 
              class="nav-item"
              :class="{ 
                'is-active': currentIndex === index, 
                'is-answered': isAnswered(q.id) 
              }"
              @click="currentIndex = index"
            >
              {{ index + 1 }}
            </div>
          </div>
          <div class="nav-footer">
            <div class="status-legend">
              <span class="legend-item"><i class="dot answered"></i>已答</span>
              <span class="legend-item"><i class="dot current"></i>当前</span>
              <span class="legend-item"><i class="dot unanswered"></i>未答</span>
            </div>
          </div>
        </aside>

        <!-- Current Question Area -->
        <div class="question-canvas shadow-sm">
          <div v-if="currentQuestion" class="question-box">
            <div class="question-header">
              <el-tag size="small" type="danger" effect="dark">{{ getTypeName(currentQuestion.questionType) }}</el-tag>
              <span class="question-score">({{ currentQuestion.score }}分)</span>
            </div>
            
            <div class="question-content" v-html="currentQuestion.content"></div>

            <!-- Question Options/Inputs -->
            <div class="answer-area">
              <!-- Single Choice -->
              <div v-if="currentQuestion.questionType === 1" class="options-list">
                <div 
                  v-for="opt in currentQuestion.options" 
                  :key="opt.id"
                  class="option-item"
                  :class="{ 'is-selected': userAnswers[currentQuestion.id] === opt.optionLabel }"
                  @click="saveAnswer(currentQuestion.id, opt.optionLabel)"
                >
                  <span class="option-label">{{ opt.optionLabel }}</span>
                  <div class="option-text" v-html="opt.content"></div>
                </div>
              </div>

              <!-- Multiple Choice -->
              <div v-else-if="currentQuestion.questionType === 2" class="options-list">
                <div 
                  v-for="opt in currentQuestion.options" 
                  :key="opt.id"
                  class="option-item"
                  :class="{ 'is-selected': isMultiSelected(currentQuestion.id, opt.optionLabel) }"
                  @click="toggleMultiSelect(currentQuestion.id, opt.optionLabel)"
                >
                  <span class="option-label">{{ opt.optionLabel }}</span>
                  <div class="option-text" v-html="opt.content"></div>
                </div>
              </div>

              <!-- True/False -->
              <div v-else-if="currentQuestion.questionType === 3" class="options-list tf-options">
                <div 
                  class="option-item"
                  :class="{ 'is-selected': userAnswers[currentQuestion.id] === 'A' || userAnswers[currentQuestion.id] === '正确' }"
                  @click="saveAnswer(currentQuestion.id, 'A')"
                >
                  <span class="option-label">A</span>
                  <div class="option-text">正确</div>
                </div>
                <div 
                  class="option-item"
                  :class="{ 'is-selected': userAnswers[currentQuestion.id] === 'B' || userAnswers[currentQuestion.id] === '错误' }"
                  @click="saveAnswer(currentQuestion.id, 'B')"
                >
                  <span class="option-label">B</span>
                  <div class="option-text">错误</div>
                </div>
              </div>

              <!-- Fill in the blanks -->
              <div v-else-if="currentQuestion.questionType === 4" class="input-area">
                <el-input 
                  v-model="userAnswers[currentQuestion.id]" 
                  placeholder="请输入答案..." 
                  @blur="saveCurrentAnswer"
                />
              </div>

              <!-- Short Answer -->
              <div v-else-if="currentQuestion.questionType === 5" class="input-area">
                <el-input 
                  v-model="userAnswers[currentQuestion.id]" 
                  type="textarea" 
                  :rows="10" 
                  placeholder="请输入答题内容..." 
                  @blur="saveCurrentAnswer"
                />
              </div>
            </div>

            <div class="question-actions">
              <el-button v-if="currentIndex > 0" @click="currentIndex--">上一题</el-button>
              <el-button v-if="currentIndex < questions.length - 1" type="primary" @click="currentIndex++">下一题</el-button>
              <el-button v-else type="success" @click="handleSubmit">最后检查并交卷</el-button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Submission Confirm Dialog -->
    <el-dialog v-model="submitDialogVisible" title="确认交卷" width="400px">
      <div class="submit-confirm-content">
        <p v-if="unansweredCount > 0" class="warning-text">您还有 <span class="count">{{ unansweredCount }}</span> 道题目未作答！</p>
        <p v-else>所有题目已完成，是否确认提交？</p>
        <p class="sub-text">提交后将无法修改，客观题将由系统自动判分。</p>
      </div>
      <template #footer>
        <el-button @click="submitDialogVisible = false">返回检查</el-button>
        <el-button type="primary" :loading="submitting" @click="doSubmit">确认交卷</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Timer, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/utils/request'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const taskId = route.params.taskId
const courseId = route.params.courseId

const loading = ref(true)
const submitting = ref(false)
const submitDialogVisible = ref(false)
const recordId = ref<number | null>(null)
const paper = ref<any>(null)
const questions = ref<any[]>([])
const currentIndex = ref(0)
const userAnswers = reactive<Record<number, any>>({})
const timeLeft = ref(0)
let timerInterval: any = null

const currentQuestion = computed(() => questions.value[currentIndex.value])
const unansweredCount = computed(() => {
  return questions.value.filter(q => !isAnswered(q.id)).length
})
const isUnlimited = computed(() => !paper.value?.durationMinutes)

function formatTime(seconds: number) {
  if (seconds <= 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getTypeName(type: number) {
  return { 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' }[type] || '未知'
}

function isAnswered(questionId: number) {
  const ans = userAnswers[questionId]
  if (Array.isArray(ans)) return ans.length > 0
  return ans !== undefined && ans !== null && ans.toString().trim() !== ''
}

async function initPage() {
  loading.value = true
  try {
    // 1. 开始考试并获取记录ID
    const startRes = await axios.post(`/v1/student/exams/${taskId}/start`) as any
    recordId.value = startRes

    // 2. 获取考试详情 (不含答案)
    const detail = await axios.get(`/v1/student/exams/${taskId}`) as any
    paper.value = detail
    questions.value = (detail?.questions || []).map((q: any) => ({ ...q, id: q.taskQuestionId }))

    // 3. Restore progress
    const progress = await axios.get(`/v1/student/answers/${recordId.value}`) as any
    if (progress?.answers) {
      Object.assign(userAnswers, progress.answers)
    }

    // 4. 初始化计时器
    const now = dayjs()
    let examTimeLeft = Infinity
    
    // a. 如果有硬截止时间
    if (paper.value?.endTime) {
      examTimeLeft = dayjs(paper.value.endTime).diff(now, 'second')
    }
    
    // b. 如果有考试时长限制 (从学生点击“开始考试”时间起算)
    if (paper.value?.durationMinutes && progress?.startTime) {
      const recordStart = dayjs(progress.startTime)
      const durationLimit = recordStart.add(paper.value.durationMinutes, 'minute')
      const durationTimeLeft = durationLimit.diff(now, 'second')
      examTimeLeft = Math.min(examTimeLeft, durationTimeLeft)
    }

    // c. 默认兜底 (仅在既没有硬截止时间，又没有时长限制时，且此时不标记为0时才兜底，或者干脆去掉兜底)
    if (examTimeLeft === Infinity) {
      if (isUnlimited.value) {
        examTimeLeft = 86400 * 365 // 一年，相当于不限时
      } else {
        examTimeLeft = 3600 // 默认一小时
      }
    }
    
    timeLeft.value = Math.max(0, examTimeLeft)
    if (!isUnlimited.value || timeLeft.value < 86400) {
      startTimer()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '加载考试失败')
    router.back()
  } finally {
    loading.value = false
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(timerInterval)
      handleAutoSubmit()
    }
  }, 1000)
}

async function saveAnswer(questionId: number, answer: any) {
  userAnswers[questionId] = answer
  await axios.post('/v1/student/answers/save', {
    recordId: recordId.value,
    taskQuestionId: questionId,
    userAnswer: String(answer)
  })
}

async function saveCurrentAnswer() {
  const q = currentQuestion.value
  if (!q) return
  const ans = userAnswers[q.id]
  if (ans !== undefined) {
    await saveAnswer(q.id, ans)
  }
}

function isMultiSelected(questionId: number, label: string) {
  const ans = userAnswers[questionId]
  if (!Array.isArray(ans)) return false
  return ans.includes(label)
}

function toggleMultiSelect(questionId: number, label: string) {
  // 防御：如果 label 无效则不处理
  if (!label) return

  let ans = userAnswers[questionId]
  // 始终保证本地是数组状态
  if (!Array.isArray(ans)) {
    try {
      const str = String(ans || '')
      ans = str ? str.split(',').filter((i: string) => !!i && i !== 'undefined') : []
    } catch {
      ans = []
    }
  }

  const idx = ans.indexOf(label)
  if (idx > -1) {
    ans.splice(idx, 1)
  } else {
    ans.push(label)
    // 只排序合法字符串，过滤掉任何 undefined
    ans = ans.filter((i: any) => !!i && i !== 'undefined').sort()
  }

  // 保持本地为数组（用于 isMultiSelected 判断），不让 saveAnswer 覆盖
  userAnswers[questionId] = [...ans] // 新引用触发响应式更新

  // 直接调 API（不走 saveAnswer，避免覆盖数组为字符串）
  axios.post('/v1/student/answers/save', {
    recordId: recordId.value,
    taskQuestionId: questionId,
    userAnswer: ans.join(',')
  }).catch(() => {/* 静默失败，下次提交时仍会保存 */})
}

function handleSubmit() {
  submitDialogVisible.value = true
}

async function doSubmit() {
  submitting.value = true
  try {
    await axios.post(`/v1/student/answers/${recordId.value}/submit`)
    ElMessage.success('试卷提交成功！系统正在自动评分中...')
    router.replace(`/course/${courseId}`)
  } catch (err: any) {
    ElMessage.error(err.message || '提交失败')
  } finally {
    submitting.value = false
    submitDialogVisible.value = false
  }
}

function handleAutoSubmit() {
  ElMessageBox.alert('考试时间已到，系统将为您自动交卷。', '系统提示', {
    confirmButtonText: '确定',
    callback: () => {
      doSubmit()
    }
  })
}

function handleExit() {
  ElMessageBox.confirm('考试正在进行中，退出将自动保存当前进度。确定返回吗？', '确认返回', {
    type: 'warning'
  }).then(() => {
    router.back()
  })
}

onMounted(() => {
  initPage()
})

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.exam-taking-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.exam-header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5e9ef;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.exam-header-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.exam-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.timer-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: #f0f2f5;
  border-radius: 20px;
  color: #606266;
  font-weight: 600;
  transition: all 0.3s;
}

.timer-warning {
  background: #fef0f0;
  color: #f56c6c;
}

.timer-text {
  font-family: monospace;
  font-size: 18px;
}

.exam-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.exam-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
  height: 100%;
}

.exam-nav {
  width: 280px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: fit-content;
}

.nav-header {
  padding: 16px;
  font-weight: 600;
  border-bottom: 1px solid #f0f2f5;
  background: #fafafa;
}

.nav-body {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.nav-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.2s;
}

.nav-item:hover {
  border-color: #409eff;
  color: #409eff;
}

.nav-item.is-answered {
  background-color: #f0f9eb;
  border-color: #67c23a;
  color: #67c23a;
}

.nav-item.is-active {
  background-color: #409eff;
  border-color: #409eff;
  color: #fff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.nav-footer {
  padding: 16px;
  border-top: 1px solid #f0f2f5;
}

.status-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.answered { background: #67c23a; }
.dot.current { background: #409eff; }
.dot.unanswered { background: #e4e7ed; }

.question-canvas {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  display: flex;
  flex-direction: column;
}

.question-header {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.question-score {
  color: #909399;
  font-size: 14px;
}

.question-content {
  font-size: 20px;
  line-height: 1.6;
  color: #303133;
  margin-bottom: 40px;
}

.answer-area {
  flex: 1;
  margin-bottom: 40px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-item {
  padding: 16px 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.option-item:hover {
  background-color: #f5f7fa;
  border-color: #dcdfe6;
}

.option-item.is-selected {
  background-color: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.option-label {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.option-text {
  font-size: 16px;
}

.tf-options {
  flex-direction: row;
}

.tf-options .option-item {
  flex: 1;
}

.question-actions {
  border-top: 1px solid #f0f2f5;
  padding-top: 32px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.submit-confirm-content {
  text-align: center;
  padding: 20px 0;
}

.warning-text {
  color: #e6a23c;
  font-weight: bold;
}

.count {
  font-size: 24px;
  margin: 0 4px;
}

.sub-text {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}
</style>
