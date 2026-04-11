<template>
  <div class="paper-composer min-h-screen">
    <div class="composer-container">
      <!-- 粘性顶栏 -->
      <header class="composer-header">
        <div class="flex justify-between items-center bg-white rounded-2xl shadow-sm px-6 py-4 border-l-4 border-red-600">
          <div class="flex items-center gap-4">
            <el-button circle plain @click="$router.back()" class="hover:bg-red-50 hover:border-red-200 flex-shrink-0">
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <div>
              <h1 class="text-xl font-bold text-gray-800">组卷编辑器</h1>
              <p class="text-xs text-gray-400 mt-0.5">填写左侧任务信息，再从题库选题组装试卷</p>
            </div>
          </div>
          <div class="flex gap-3">
            <el-button size="large" @click="handleSaveDraft" :loading="saving" class="rounded-xl">
              <el-icon class="mr-1"><Document /></el-icon>保存草稿
            </el-button>
            <el-button type="primary" size="large" @click="handlePublish" :loading="publishing" class="rounded-xl shadow-md bg-red-600 border-red-600">
              <el-icon class="mr-1"><Position /></el-icon>发布任务
            </el-button>
          </div>
        </div>
      </header>

      <div class="layout-body">
        <aside class="sidebar-aside sticky top-28">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            <div class="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
              <el-icon class="text-red-500 text-lg"><Setting /></el-icon>
              <span class="font-bold text-gray-700 text-base">任务设置</span>
            </div>
            <el-form :model="taskForm" label-position="top" size="large">
              <el-form-item label="任务标题" required>
                <el-input v-model="taskForm.taskTitle" placeholder="请输入任务标题" />
              </el-form-item>
              
              <el-form-item label="考试时长">
                <el-input-number v-model="taskForm.durationMinutes" :min="0" :max="600" class="w-full" />
                <div class="text-xs text-gray-400 mt-1">填 0 表示不限时，单位：分钟</div>
              </el-form-item>

              <el-form-item label="开始时间">
                <el-date-picker 
                  v-model="taskForm.startTime" 
                  type="datetime" 
                  placeholder="任务开放时间" 
                  value-format="YYYY-MM-DD HH:mm:ss"
                  class="!w-full"
                />
              </el-form-item>

              <el-form-item label="截止时间">
                <el-date-picker 
                  v-model="taskForm.endTime" 
                  type="datetime" 
                  placeholder="最终截止时间" 
                  value-format="YYYY-MM-DD HH:mm:ss"
                  class="!w-full"
                />
              </el-form-item>

              <el-form-item label="考试说明" class="mb-0">
                <el-input v-model="taskForm.taskDescription" type="textarea" :rows="4" placeholder="学生开始前可见的说明与注意事项..." />
              </el-form-item>
            </el-form>
          </div>
        </aside>

        <!-- 右侧：组卷核心区域 -->
        <main class="compose-main">
          <!-- 组卷统计与工具栏 -->
          <div class="bg-white rounded-2xl px-8 py-5 flex justify-between items-center border border-gray-100 shadow-sm">
            <div class="flex items-center gap-10">
              <div class="text-center">
                <div class="text-3xl font-bold text-gray-800">{{ paperQuestions.length }}</div>
                <div class="text-xs text-gray-400 mt-1">题目总数</div>
              </div>
              <div class="w-px h-10 bg-gray-200"></div>
              <div class="text-center">
                <div class="text-3xl font-bold text-red-600">{{ totalScore }}</div>
                <div class="text-xs text-gray-400 mt-1">当前总分</div>
              </div>
            </div>
            <div class="flex gap-3">
              <el-button type="danger" size="large" @click="openManualInput">
                <el-icon class="mr-1"><Edit /></el-icon>单题录入
              </el-button>
              <el-button type="danger" plain size="large" @click="openBankSelect">
                <el-icon class="mr-1"><Collection /></el-icon>题库选题
              </el-button>
              <el-dropdown trigger="click">
                <el-button size="large" circle plain><el-icon><MoreFilled /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="openSmartRecommend">
                      <el-icon><MagicStick /></el-icon>AI 智能抽题
                    </el-dropdown-item>
                    <el-dropdown-item @click="openImport">
                      <el-icon><Upload /></el-icon>批量导入
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <!-- 题目列表 -->
          <div class="questions-container">
            <div v-if="paperQuestions.length === 0" class="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-24 flex flex-col items-center justify-center">
              <el-empty :image-size="140" description="试卷目前空空如也，请从题库添加题目" />
              <el-button type="primary" size="large" @click="openBankSelect" class="mt-6 bg-red-600 border-red-600 rounded-xl">从题库开始引入</el-button>
            </div>
              
              <transition-group name="list" tag="div" class="space-y-6">
                <div 
                  v-for="(q, index) in paperQuestions" 
                  :key="q.id" 
                  class="question-card group"
                >
                  <div class="card-inner bg-white border border-gray-100 rounded-2xl p-6 shadow-sm group-hover:shadow-md transition-all group-hover:border-red-100">
                    <div class="flex justify-between items-start mb-5">
                      <div class="flex items-center gap-3">
                        <span class="index-tag bg-gray-800 text-white w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold">{{ index + 1 }}</span>
                        <el-tag :type="q.questionType < 4 ? 'danger' : 'warning'" effect="light" round size="small">
                          {{ getTypeName(q.questionType) }}
                        </el-tag>
                      </div>
                      <div class="flex items-center gap-4">
                        <div class="score-input flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                          <span class="text-xs text-gray-500 mr-2">分值</span>
                          <el-input-number v-model="q.score" :min="1" :max="100" size="small" controls-position="right" class="mini-number w-20" @change="calculateTotal" />
                        </div>
                        <el-button type="danger" link icon="Delete" @click="removeQuestion(index)" class="opacity-0 group-hover:opacity-100 transition-opacity">移除</el-button>
                      </div>
                    </div>
                    
                    <div class="question-content text-gray-700 leading-relaxed text-sm mb-5 prose prose-sm max-w-none" v-html="q.content"></div>
                    
                    <!-- 选项展现优化 -->
                    <div v-if="q.questionType === 1 || q.questionType === 2" class="options-preview space-y-2 mb-4">
                      <div v-for="opt in q.options" :key="opt.id" 
                           :class="['opt-box flex items-center p-3 rounded-xl border border-transparent transition-colors', opt.isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-gray-50/50']">
                        <span :class="['font-bold mr-3 w-6 h-6 flex items-center justify-center rounded-full text-xs', opt.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500']">
                          {{ opt.optionLabel }}
                        </span>
                        <span class="flex-1 text-sm text-gray-600" v-html="opt.content"></span>
                        <el-icon v-if="opt.isCorrect" color="#10b981" class="ml-2"><Check /></el-icon>
                      </div>
                    </div>
                    
                    <!-- 答案预览 -->
                    <div class="answer-preview p-4 bg-gray-50 rounded-xl text-xs border border-gray-100">
                      <div class="flex items-center gap-4 text-gray-500">
                        <el-icon class="mr-1 text-red-500"><Key /></el-icon>
                        <span class="font-bold mr-2 text-gray-700">参考答案:</span>
                        <span class="text-red-600 font-bold">{{ q.correctAnswer || q.referenceAnswer || '见系统解析' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </transition-group>
            </div>
        </main>
      </div>
    </div>

    <!-- 题库选题弹窗 -->
    <el-dialog v-model="showBankSelect" title="从题库选题" width="1100px" top="4vh" class="bank-select-dialog" :close-on-click-modal="false">
      <div class="bank-dialog-body">
        <!-- 第一行：范围切换 + 筛选 + 搜索 + 查询 -->
        <div class="bank-toolbar-row">
          <el-radio-group v-model="bankScope" @change="handleScopeChange" size="default">
            <el-radio-button value="course">本门课程题目</el-radio-button>
            <el-radio-button value="public">全校公共题库</el-radio-button>
          </el-radio-group>

          <el-select v-model="bankQuery.questionType" placeholder="所有题型" clearable class="bank-type-select" @change="fetchBank">
            <el-option label="单选题" :value="1" />
            <el-option label="多选题" :value="2" />
            <el-option label="判断题" :value="3" />
            <el-option label="填空题" :value="4" />
            <el-option label="简答题" :value="5" />
          </el-select>

          <el-input v-model="bankQuery.keyword" placeholder="输入关键词搜索题目..." class="bank-search-input" @keyup.enter="fetchBank" clearable>
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>

          <el-button type="primary" @click="fetchBank" class="bg-red-600 border-red-600">查询</el-button>

          <div class="bank-toolbar-right">
            <el-button @click="handleDownloadTemplate">
              <el-icon class="mr-1"><Download /></el-icon>下载模板
            </el-button>
            <el-upload action="#" :auto-upload="false" :show-file-list="false" :on-change="handleImportFile" accept=".xlsx,.xls">
              <el-button type="primary" plain>
                <el-icon class="mr-1"><Upload /></el-icon>批量导入
              </el-button>
            </el-upload>
          </div>
        </div>

        <!-- 题目表格 -->
        <el-table 
          :data="bankQuestions"
          v-loading="bankLoading"
          border
          stripe
          @selection-change="handleSelectionChange"
          class="bank-table"
          style="width: 100%"
        >
          <el-table-column type="selection" width="50" fixed />
          <el-table-column label="题型" width="100" fixed>
            <template #default="{ row }">
              <el-tag :type="row.questionType < 4 ? 'danger' : 'warning'" size="small">{{ getTypeName(row.questionType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="题目内容">
            <template #default="{ row }">
              <div class="text-sm text-gray-700 leading-relaxed line-clamp-2" v-html="row.content"></div>
            </template>
          </el-table-column>
          <el-table-column label="难度" width="120">
            <template #default="{ row }">
              <el-rate v-model="row.difficulty" disabled size="small" />
            </template>
          </el-table-column>
        </el-table>

        <!-- 底部：已选计数 + 分页 -->
        <div class="bank-footer-row">
          <div class="text-sm text-gray-500">
            已选择 <span class="text-red-600 font-bold text-base mx-1">{{ selectedBankItems.length }}</span> 道题目
          </div>
          <el-pagination 
            background 
            layout="prev, pager, next, total" 
            :total="bankTotal" 
            v-model:current-page="bankQuery.pageNum" 
            @current-change="fetchBank" 
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <el-button size="large" @click="showBankSelect = false">取消</el-button>
          <el-button type="primary" size="large" @click="confirmBankSelection" :disabled="selectedBankItems.length === 0" class="bg-red-600 border-red-600">
            确定添加 {{ selectedBankItems.length > 0 ? selectedBankItems.length + ' 道题目' : '题目' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

      <!-- 单题录入对话框 -->
      <el-dialog v-model="showManualInput" title="手动录入新题目" width="700px" top="5vh">
        <el-form :model="manualForm" label-position="top">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="题型" required>
                <el-select v-model="manualForm.questionType" class="w-full">
                  <el-option label="单选题" :value="1" />
                  <el-option label="多选题" :value="2" />
                  <el-option label="判断题" :value="3" />
                  <el-option label="填空题" :value="4" />
                  <el-option label="简答题" :value="5" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="难度" required>
                <el-rate v-model="manualForm.difficulty" class="mt-2" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="所属学科">
                <el-tree-select 
                  v-model="manualForm.categoryId" 
                  :data="categoryTree" 
                  :props="{ label: 'categoryName', value: 'id', children: 'children' }" 
                  node-key="id" 
                  placeholder="不选则使用本课程学科" 
                  clearable 
                  check-strictly
                  class="w-full"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
               <el-form-item label="素养维度">
                <el-select v-model="manualForm.dimensions" multiple placeholder="默认全维度(可多选)" class="w-full">
                  <el-option label="知识技能素养" value="1" />
                  <el-option label="职业品格素养" value="2" />
                  <el-option label="创新实践素养" value="3" />
                  <el-option label="社会责任素养" value="4" />
                  <el-option label="发展适应素养" value="5" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="题目内容" required>
            <el-input v-model="manualForm.content" type="textarea" :rows="3" placeholder="请输入题干内容..." />
          </el-form-item>

          <!-- 选项编辑 (选择题) -->
          <div v-if="manualForm.questionType === 1 || manualForm.questionType === 2" class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-bold text-gray-600">选项设置</span>
              <el-button type="primary" link @click="addManualOption" icon="Plus">添加选项</el-button>
            </div>
            <div v-for="(opt, idx) in manualOptions" :key="idx" class="flex items-center gap-2 mb-2">
              <span class="font-bold w-6">{{ String.fromCharCode(65 + idx) }}.</span>
              <el-input v-model="opt.content" placeholder="选项内容" class="flex-1" />
              <el-checkbox v-model="opt.isCorrect" @change="handleManualOptCheck(idx)">正确答案</el-checkbox>
              <el-button type="danger" link icon="Delete" @click="removeManualOption(idx)" v-if="manualOptions.length > 2" />
            </div>
          </div>

          <el-form-item v-if="manualForm.questionType === 3" label="判断题答案">
            <el-radio-group v-model="manualForm.correctAnswer">
              <el-radio value="正确">正确</el-radio>
              <el-radio value="错误">错误</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="manualForm.questionType === 4 || manualForm.questionType === 5" :label="manualForm.questionType === 4 ? '标准答案' : '参考解析'">
            <el-input v-model="manualForm.correctAnswer" type="textarea" :rows="2" placeholder="请输入答案内容..." />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showManualInput = false">取消</el-button>
          <el-button type="primary" @click="submitManualQuestion" class="bg-red-600 border-red-600">保存并加入试卷</el-button>
        </template>
      </el-dialog>

      <!-- 智能抽题弹窗 -->
      <el-dialog v-model="showSmartRecommend" title="AI智能抽题" width="550px">
        <el-form label-width="110px">
          <el-form-item label="抽题数量">
            <el-input-number v-model="recommendParams.count" :min="1" :max="50" />
            <span class="ml-3 text-xs text-gray-400">目前系统内置随机抽题</span>
          </el-form-item>
          <el-form-item label="所属学科">
            <el-tree-select 
              v-model="recommendParams.categoryId" 
              :data="categoryTree" 
              :props="{ label: 'categoryName', value: 'id', children: 'children' }" 
              node-key="id" 
              placeholder="默认全学科 (选择父级将向下兼容所有子分类)" 
              clearable 
              check-strictly
              class="w-full"
            />
          </el-form-item>
          <el-form-item label="素养维度">
             <el-select v-model="recommendParams.dimensions" multiple placeholder="默认不限制 (可结合画像选取薄弱点)" class="w-full">
              <el-option label="知识技能素养" value="1" />
              <el-option label="职业品格素养" value="2" />
              <el-option label="创新实践素养" value="3" />
              <el-option label="社会责任素养" value="4" />
              <el-option label="发展适应素养" value="5" />
            </el-select>
          </el-form-item>
          <el-form-item label="题型分布">
            <p class="text-xs text-gray-500 leading-tight mt-1">系统将基于系统内该课程/学科维度的画像特征，自动为您匹配最具考察价值的客观题和主观题。</p>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showSmartRecommend = false">取消</el-button>
          <el-button type="primary" :loading="recommending" @click="handleRecommend" class="bg-red-600 border-red-600">开始抽题</el-button>
        </template>
      </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getQuestionList, recommendQuestions, createQuestion as apiCreateQuestion, downloadTemplate, importQuestions, type QuestionItem, type QuestionQuery } from '@/api/question'
import { getCategoryTree } from '@/api/resource'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Setting, Document, Position, Check, Delete, Key, Collection, MagicStick, Search, Plus, Edit, Download, Upload, MoreFilled } from '@element-plus/icons-vue'
import axios from '@/utils/request'

const route = useRoute()
const router = useRouter()
const courseId = route.params.courseId as string
const currentTaskId = ref<string | null>(route.params.taskId === 'new' ? null : (route.params.taskId as string))

interface PaperQuestion extends QuestionItem {
  score?: number
}

const paperQuestions = ref<PaperQuestion[]>([])
const taskForm = reactive({
  taskTitle: '',
  taskDescription: '',
  startTime: '',
  endTime: '',
  durationMinutes: 0
})

const saving = ref(false)
const publishing = ref(false)

const totalScore = computed(() => {
  return paperQuestions.value.reduce((sum, q) => sum + (Number(q.score) || 0), 0)
})

function calculateTotal() {
  paperQuestions.value = [...paperQuestions.value]
}

function removeQuestion(idx: number) {
  paperQuestions.value.splice(idx, 1)
}

function getTypeName(type: number) {
  return { 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' }[type] || '未知'
}

// 题库选择逻辑
const showBankSelect = ref(false)
const bankLoading = ref(false)
const bankQuestions = ref<QuestionItem[]>([])
const bankTotal = ref(0)
const selectedBankItems = ref<QuestionItem[]>([])
const bankScope = ref('course') // 'course' or 'public'

const bankQuery = reactive<QuestionQuery>({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  questionType: undefined,
  courseId: courseId
})

function openBankSelect() {
  showBankSelect.value = true
  fetchBank()
}

function handleScopeChange(val: any) {
  bankQuery.courseId = val === 'course' ? courseId : '0'
  bankQuery.pageNum = 1
  fetchBank()
}

async function fetchBank() {
  bankLoading.value = true
  try {
    const res = await getQuestionList(bankQuery) as any
    bankQuestions.value = res.list || []
    bankTotal.value = res.total || 0
  } catch (err) {
    ElMessage.error('获取题库失败')
  } finally {
    bankLoading.value = false
  }
}

function handleSelectionChange(selection: QuestionItem[]) {
  selectedBankItems.value = selection
}

function confirmBankSelection() {
  const toAdd = selectedBankItems.value.map(item => ({
    ...item,
    score: item.questionType === 5 ? 10 : 5 
  }))
  paperQuestions.value.push(...toAdd)
  showBankSelect.value = false
  ElMessage.success(`成功添加 ${toAdd.length} 道题目`)
}

// 单题导入逻辑 (由于用户要求暂时不实现导入即加入，仅保留导入功能)
function openImport() {
  openBankSelect() // 引导用户去题库弹窗进行导入
}

async function handleDownloadTemplate() {
  try {
    await downloadTemplate()
    ElMessage.success('模板下载成功')
  } catch {
    ElMessage.error('模板下载失败，请检查网络连接')
  }
}

async function handleImportFile(file: any) {
  try {
    // 教师在本课程弹窗导入时传入当前 courseId，导入到本门课程题库
    await importQuestions(file.raw, courseId)
    ElMessage.success('导入成功，请点击查询查看')
    fetchBank()
  } catch {
    ElMessage.error('导入失败，请检查文件格式是否正确')
  }
}

// 单题手动录入逻辑
const showManualInput = ref(false)
const manualForm = reactive({
  questionType: 1,
  difficulty: 2,
  content: '',
  correctAnswer: '',
  analysis: '',
  categoryId: undefined as string | undefined,
  dimensions: [] as string[]
})
const manualOptions = ref([
  { content: '', isCorrect: false },
  { content: '', isCorrect: false },
  { content: '', isCorrect: false },
  { content: '', isCorrect: false }
])

function openManualInput() {
  showManualInput.value = true
  // Reset form
  manualForm.content = ''
  manualForm.correctAnswer = ''
  manualForm.questionType = 1
  manualForm.categoryId = undefined
  manualForm.dimensions = []
  manualOptions.value = [
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false }
  ]
}

function addManualOption() {
  manualOptions.value.push({ content: '', isCorrect: false })
}

function removeManualOption(idx: number) {
  manualOptions.value.splice(idx, 1)
}

function handleManualOptCheck(idx: number) {
  if (manualForm.questionType === 1) {
    manualOptions.value.forEach((o, i) => o.isCorrect = i === idx)
  }
}

async function submitManualQuestion() {
  if (!manualForm.content.trim()) return ElMessage.warning('请输入题目内容')
  
  const payload: any = {
    ...manualForm,
    courseId: bankScope.value === 'public' ? 0 : Number(courseId),
    dimensions: manualForm.dimensions.join(',')
  }

  // 组装选项
  if (manualForm.questionType <= 2) {
    payload.options = manualOptions.value.map((o, i) => ({
      optionLabel: String.fromCharCode(65 + i),
      content: o.content,
      isCorrect: o.isCorrect,
      sortOrder: i+1
    }))
    if (!payload.options.some((o:any) => o.isCorrect)) return ElMessage.warning('请设置正确答案')
  } else if (manualForm.questionType === 3) {
    const isTrue = manualForm.correctAnswer === '正确'
    payload.options = [
      { optionLabel: 'A', content: '正确', isCorrect: isTrue, sortOrder: 1 },
      { optionLabel: 'B', content: '错误', isCorrect: !isTrue, sortOrder: 2 }
    ]
  }

  try {
    const res = await apiCreateQuestion(payload)
    // 加入当前试卷
    const newQuestion: PaperQuestion = {
      ...payload,
      id: (res as any).data,
      score: payload.questionType === 5 ? 10 : 5
    }
    paperQuestions.value.push(newQuestion)
    showManualInput.value = false
    ElMessage.success('录入成功并已加入试卷')
  } catch {
    ElMessage.error('录入失败')
  }
}

// 智能抽题逻辑
const showSmartRecommend = ref(false)
const recommending = ref(false)
const recommendParams = reactive({
  count: 10,
  categoryId: undefined as string | undefined,
  dimensions: [] as string[]
})

function openSmartRecommend() {
  showSmartRecommend.value = true
}

async function handleRecommend() {
  recommending.value = true
  try {
    const res = await recommendQuestions(
      recommendParams.count, 
      bankScope.value === 'public' ? undefined : courseId,
      recommendParams.categoryId,
      recommendParams.dimensions.length > 0 ? recommendParams.dimensions.join(',') : undefined
    )
    const recs = (res as any).data.map((item: any) => ({
      ...item,
      score: item.questionType === 5 ? 10 : 5
    }))
    paperQuestions.value.push(...recs)
    showSmartRecommend.value = false
    ElMessage.success(`智能抽出 ${recs.length} 道题目`)
  } catch {
    ElMessage.error('智能抽题失败')
  } finally {
    recommending.value = false
  }
}

// 学科分类树
const categoryTree = ref<any[]>([])
async function fetchCategoryTree() {
  try {
    const res = await getCategoryTree()
    categoryTree.value = (res as any).data || []
  } catch (err) {
    console.error('获取学科树失败', err)
  }
}

// 页面数据装载
onMounted(async () => {
  fetchCategoryTree()

  if (!currentTaskId.value) {
    taskForm.taskTitle = '新建任务_' + new Date().toLocaleDateString()
    return
  }

  try {
    const res = await axios.get<any, any>(`/api/v1/papers/${currentTaskId.value}`)
    if (res && res.data) {
      taskForm.taskTitle = res.data.taskTitle || ''
      taskForm.taskDescription = res.data.taskDescription || ''
      taskForm.startTime = res.data.startTime || ''
      taskForm.endTime = res.data.endTime || ''
      taskForm.durationMinutes = res.data.durationMinutes || 0
      
      if (res.data.questions) {
        paperQuestions.value = res.data.questions.map((pq: any) => ({
          ...pq,
          id: pq.questionId,
          score: pq.score
        }))
      }
    }
  } catch (err) {
    console.error('获取已有试卷信息失败', err)
  }
})

// 保存草稿
async function handleSaveDraft() {
  if (!taskForm.taskTitle.trim()) {
    return ElMessage.warning('任务标题不能为空')
  }
  
  saving.value = true
  try {
    const payload = {
      taskId: currentTaskId.value ? Number(currentTaskId.value) : null,
      courseId: Number(courseId),
      taskTitle: taskForm.taskTitle,
      taskDescription: taskForm.taskDescription,
      startTime: taskForm.startTime,
      endTime: taskForm.endTime,
      durationMinutes: taskForm.durationMinutes,
      questions: paperQuestions.value.map((q, idx) => ({
        questionId: q.id,
        score: q.score,
        sortOrder: idx + 1
      }))
    }
    const res = await axios.post<any, any>('/api/v1/papers/manual', payload)
    
    // 如果是首次保存，更新 taskId 并替换路由
    if (!currentTaskId.value && res && res.data) {
      currentTaskId.value = String(res.data)
      router.replace(`/course/${courseId}/paper-composer/${currentTaskId.value}`)
    }
    
    ElMessage.success('草稿保存成功')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 发布此任务
async function handlePublish() {
  if (!taskForm.taskTitle.trim()) {
    return ElMessage.warning('请先填写任务标题')
  }
  if (!taskForm.startTime || !taskForm.endTime) {
    return ElMessage.warning('正式发布需要设置开始时间和截止时间')
  }
  if (paperQuestions.value.length === 0) {
    return ElMessage.warning('试卷内容不能为空，请先添加题目')
  }
  
  await ElMessageBox.confirm(`确定要发布任务【${taskForm.taskTitle}】吗？发布后学生将可见并可作答。`, '发布确认', {
    type: 'warning'
  })
  
  publishing.value = true
  try {
    // 1. 先保存所有内容（元数据+题目）
    const payload = {
      taskId: currentTaskId.value ? Number(currentTaskId.value) : null,
      courseId: Number(courseId),
      taskTitle: taskForm.taskTitle,
      taskDescription: taskForm.taskDescription,
      startTime: taskForm.startTime,
      endTime: taskForm.endTime,
      durationMinutes: taskForm.durationMinutes,
      questions: paperQuestions.value.map((q, idx) => ({
        questionId: q.id,
        score: q.score,
        sortOrder: idx + 1
      }))
    }
    const res = await axios.post<any, any>('/api/v1/papers/manual', payload)
    const activeTaskId = currentTaskId.value || String(res.data)
    
    // 2. 更新任务状态为进行中 (1)
    await axios.put(`/api/v1/courses/${courseId}/tasks/${activeTaskId}/status?status=1`)
    
    ElMessage.success('发布成功')
    router.replace(`/course/${courseId}`)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '发布失败')
  } finally {
    publishing.value = false
  }
}
</script>

<style scoped>
/* ===== 外层容器 ===== */
.paper-composer {
  background-color: #f1f5f9;
}

.composer-container {
  max-width: 1500px;
  margin: 0 auto;
  padding: 0 2.5rem 6rem;
}

/* ===== 粘性顶栏 ===== */
.composer-header {
  position: sticky;
  top: 0;
  z-index: 200;
  padding-top: 1.5rem;
  padding-bottom: 1.25rem;
  background-color: #f1f5f9;
}

/* ===== 主布局 ===== */
.layout-body {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

/* ===== 左侧侧边栏 ===== */
.sidebar-aside {
  width: 360px;
  flex-shrink: 0;
}

/* ===== 右侧主区域 ===== */
.compose-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ===== 题目容器 ===== */
.questions-container {
  min-height: 420px;
}

/* ===== 题目卡片 ===== */
.question-card .card-inner {
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

/* ===== 列表动画 ===== */
.list-enter-active,
.list-leave-active {
  transition: all 0.35s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(60px);
}

/* ===== 分值输入框 ===== */
.mini-number :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background-color: transparent !important;
}

/* ===== 表单标签 ===== */
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #374151;
  padding-bottom: 4px;
}

/* ===== 弹窗内 Radio 按钮 ===== */
.bank-select-dialog :deep(.el-radio-button__inner) {
  padding: 8px 18px;
  font-size: 13px;
}

/* ===== 题库弹窗整体容器 ===== */
.bank-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== 弹窗工具栏行 ===== */
.bank-toolbar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

/* 题型选择框固定宽度 */
.bank-type-select {
  width: 130px;
  flex-shrink: 0;
}

/* 搜索框自适应，最小 200px，不超过 280px */
.bank-search-input {
  flex: 1;
  min-width: 200px;
  max-width: 280px;
}

/* 下载/导入按钮组推到最右 */
.bank-toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ===== 弹窗表格 ===== */
.bank-table {
  border-radius: 8px;
  overflow: hidden;
}
.bank-table :deep(.el-table__body-wrapper) {
  max-height: 440px;
  overflow-y: auto;
}

/* ===== 弹窗底部行 ===== */
.bank-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
</style>
