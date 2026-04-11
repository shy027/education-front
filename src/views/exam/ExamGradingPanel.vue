<template>
  <div class="exam-grading-panel p-6 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center">
          <el-button icon="ArrowLeft" circle @click="$router.back()" class="mr-4" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">交卷与批改</h1>
            <p class="text-gray-500 mt-1">查看学生提交情况并进行人工评阅。</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="stat-card">
            <span class="label">已提交</span>
            <span class="value">{{ totalSubmitted }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- Left: Student List -->
        <div class="col-span-4 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[750px]">
          <div class="p-4 border-b bg-gray-50 font-semibold">学生列表 ({{ submittedList.length }})</div>
          <div class="flex-1 overflow-y-auto">
            <div 
              v-for="record in submittedList" 
              :key="record.recordId" 
              class="p-4 border-b hover:bg-blue-50 cursor-pointer transition-colors"
              :class="{ 'bg-blue-50 border-l-4 border-blue-500': selectedRecord?.recordId === record.recordId }"
              @click="selectStudent(record)"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-gray-800">{{ record.studentName }}</span>
                <el-tag size="small" :type="getStatusType(record.gradingStatus)">
                  {{ getStatusLabel(record.gradingStatus) }}
                </el-tag>
              </div>
              <div class="flex justify-between items-center text-sm text-gray-500">
                <span>总分: <span class="text-blue-600 font-bold">{{ record.totalScore || 0 }}</span></span>
                <span v-if="record.pendingCount > 0" class="text-red-500 font-medium">待批改: {{ record.pendingCount }}</span>
                <span v-else class="text-green-600 font-medium">批改完成</span>
              </div>
            </div>
            <el-empty v-if="submittedList.length === 0" description="暂无提交记录" />
          </div>
        </div>

        <!-- Right: Grading Area -->
        <div class="col-span-8 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[750px]">
          <template v-if="selectedRecord">
            <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <span class="font-bold text-lg text-gray-800">{{ selectedRecord.studentName }} 的答卷</span>
                <span class="ml-4 text-gray-500">当前总分：<span class="text-red-600 font-bold text-xl">{{ selectedRecord.totalScore || 0 }}</span></span>
              </div>
              <el-button type="success" @click="handlePublishResult" :disabled="selectedRecord.gradingStatus !== 2">发布成绩</el-button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 space-y-8">
              <div v-for="(ans, idx) in selectedRecord.answers" :key="ans.answerId" class="grading-item border-b pb-6 last:border-0">
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center space-x-2">
                    <span class="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{{ idx + 1 }}</span>
                    <el-tag size="small">{{ getTypeName(ans.questionType) }}</el-tag>
                  </div>
                  <div class="flex items-center space-x-3">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-gray-500">打分:</span>
                      <el-input-number 
                        v-model="gradingForm[ans.answerId].score" 
                        :max="ans.fullScore" 
                        :min="0" 
                        size="small" 
                        @change="saveGrade(ans.answerId)" 
                      />
                    </div>
                    <span class="text-gray-400">/ {{ ans.fullScore }}</span>
                    <el-icon v-if="ans.isCorrect === true" color="#67c23a"><CircleCheck /></el-icon>
                    <el-icon v-else-if="ans.isCorrect === false" color="#f56c6c"><CircleClose /></el-icon>
                  </div>
                </div>

                <div class="question-content bg-gray-50 p-3 rounded mb-4 text-gray-800" v-html="ans.questionContent"></div>
                
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div class="p-3 bg-blue-50 rounded border border-blue-100">
                    <div class="font-bold text-blue-800 mb-1">学生答案：</div>
                    <div class="whitespace-pre-wrap">{{ ans.userAnswer || '(未作答)' }}</div>
                  </div>
                  <div class="p-3 bg-green-50 rounded border border-green-100">
                    <div class="font-bold text-green-800 mb-1">标准/参考答案：</div>
                    <div class="whitespace-pre-wrap">{{ ans.correctAnswer || '无' }}</div>
                  </div>
                </div>
                
                <div class="mt-4">
                  <el-input 
                    v-model="gradingForm[ans.answerId].comment" 
                    placeholder="输入评语（可选）..." 
                    size="small"
                    @blur="saveGrade(ans.answerId)" 
                  >
                    <template #prepend>评语</template>
                  </el-input>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="h-full flex items-center justify-center text-gray-400">
            请从左侧选择一名学生开始批改
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/utils/request'

const route = useRoute()
const taskId = route.params.taskId

const submittedList = ref<any[]>([])
const totalSubmitted = ref(0)
const selectedRecord = ref<any>(null)
const gradingForm = reactive<Record<number, { score: number, comment: string }>>({})

async function fetchList() {
  try {
    const res = await axios.get(`/v1/grading/pending?taskId=${taskId}&pageSize=100`)
    submittedList.value = res.data.list || res.data.records || []
    totalSubmitted.value = res.data.total || 0
  } catch (err) {
    ElMessage.error('获取列表失败')
  }
}

async function selectStudent(recordSummary: any) {
  try {
    const res = await axios.get(`/v1/grading/${recordSummary.recordId}`)
    const fullDetail = res.data
    
    // 初始化打分表单
    fullDetail.answers.forEach((ans: any) => {
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
      answerId: answerId,
      score: form.score,
      comment: form.comment
    })
    
    // 局部更新总分 (如果后端 recalculateTotalScore 成功)
    const selectRes = await axios.get(`/v1/grading/${selectedRecord.value.recordId}`)
    selectedRecord.value.totalScore = selectRes.data.totalScore
    selectedRecord.value.gradingStatus = selectRes.data.gradingStatus
    selectedRecord.value.pendingCount = selectRes.data.pendingCount
    
    // 同时更新左侧列表状态
    const recordInList = submittedList.value.find(r => r.recordId === selectedRecord.value.recordId)
    if (recordInList) {
      recordInList.totalScore = selectedRecord.value.totalScore
      recordInList.gradingStatus = selectedRecord.value.gradingStatus
      recordInList.pendingCount = selectedRecord.value.pendingCount
    }
  } catch (err) {
    ElMessage.error('打分失败')
  }
}

async function handlePublishResult() {
  await ElMessageBox.confirm('发布成绩后，学生将可以查看到最终得分及评语。确定发布吗？', '提示', {
    type: 'warning'
  })
  
  try {
    await axios.post(`/v1/grading/${selectedRecord.value.recordId}/publish`)
    ElMessage.success('成绩已发布')
    fetchList()
  } catch (err) {
    ElMessage.error('发布失败')
  }
}

function getStatusType(status: number) {
  return { 0: 'info', 1: 'warning', 2: 'success' }[status] || 'info'
}

function getStatusLabel(status: number) {
  return { 0: '未批改', 1: '批改中', 2: '批改完成' }[status] || '待处理'
}

function getTypeName(type: number) {
  return { 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' }[type] || '未知'
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.exam-grading-panel {
  color: #303133;
}

.stat-card {
  background: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-card .label {
  font-size: 12px;
  color: #909399;
}

.stat-card .value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.grading-item {
  transition: all 0.3s;
}

:deep(.el-input-number.is-controls-right .el-input__wrapper) {
  padding-left: 5px;
  padding-right: 5px;
}
</style>
