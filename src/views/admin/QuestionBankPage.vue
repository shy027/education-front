<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">题库管理</h1>
          <p class="text-gray-500 mt-1">管理系统内的所有试题库，支持检索、录入和批量导入。</p>
        </div>
        <div class="flex space-x-3">
          <button @click="handleDownloadTemplate" class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center">
            <span class="mr-2">⏬</span> 下载导入模板
          </button>
          
          <label class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer flex items-center">
            <span class="mr-2">📁</span> 批量导入
            <input type="file" class="hidden" accept=".xlsx,.xls" @change="handleImport" />
          </label>

          <button @click="openScoreConfig()" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center">
            <span class="mr-2">⚙️</span> 分值设置
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4">
        <select v-model="queryParams.questionType" class="border-gray-300 rounded-md shadow-sm" @change="handleSearch">
          <option value="">全部题型</option>
          <option value="1">单选题</option>
          <option value="2">多选题</option>
          <option value="3">判断题</option>
          <option value="4">填空题</option>
          <option value="5">简答题</option>
        </select>
        <select v-model="queryParams.difficulty" class="border-gray-300 rounded-md shadow-sm" @change="handleSearch">
          <option value="">全部难度</option>
          <option value="1">简单</option>
          <option value="2">中等</option>
          <option value="3">困难</option>
        </select>
        <input 
          v-model="queryParams.keyword" 
          type="text" 
          placeholder="搜索题目内容..." 
          class="border-gray-300 rounded-md shadow-sm w-64"
          @keyup.enter="handleSearch"
        />
        <button @click="handleSearch" class="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-gray-700">查询</button>
        <button @click="resetQuery" class="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">重置</button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题目内容</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题型</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">难度</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题库属性</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in tableData" :key="item.id">
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 line-clamp-2" v-html="item.content"></div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {{ getTypeName(item.questionType) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="['px-2 inline-flex text-xs leading-5 font-semibold rounded-full', getDifficultyClass(item.difficulty)]">
                  {{ getDifficultyName(item.difficulty) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <el-tag :type="!item.courseId || item.courseId === '0' || item.courseId === 0 ? 'success' : 'info'" size="small" effect="plain">
                  {{ (!item.courseId || item.courseId === '0' || item.courseId === 0) ? '全局公共' : '关联课程: ' + item.courseId }}
                </el-tag>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="openDialog(item)" class="text-indigo-600 hover:text-indigo-900 mr-4">编辑</button>
                <button @click="handleDelete(item.id!)" class="text-red-600 hover:text-red-900">删除</button>
              </td>
            </tr>
            <tr v-if="tableData.length === 0">
              <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                抱歉，暂无匹配的题目数据
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Pagination -->
        <div class="px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div class="text-sm text-gray-700">
            共 <span class="font-medium">{{ total }}</span> 条
          </div>
          <div class="flex space-x-2">
            <button 
              @click="handlePageChange(queryParams.pageNum! - 1)" 
              :disabled="queryParams.pageNum === 1"
              class="px-3 py-1 border rounded-md disabled:opacity-50">
              上一页
            </button>
            <button 
              @click="handlePageChange(queryParams.pageNum! + 1)"
              :disabled="tableData.length < queryParams.pageSize!"
              class="px-3 py-1 border rounded-md disabled:opacity-50">
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Create Dialog (Simplified) -->
    <div v-if="dialogVisible" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="dialogVisible = false"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
              {{ isEdit ? '编辑题目' : '手工录入题目' }}
            </h3>
            
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">题型</label>
                  <select v-model="form.questionType" class="w-full border-gray-300 rounded-md shadow-sm">
                    <option :value="1">单选题</option>
                    <option :value="2">多选题</option>
                    <option :value="3">判断题</option>
                    <option :value="4">填空题</option>
                    <option :value="5">简答题</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">难度</label>
                  <select v-model="form.difficulty" class="w-full border-gray-300 rounded-md shadow-sm">
                    <option :value="1">简单</option>
                    <option :value="2">中等</option>
                    <option :value="3">困难</option>
                    <option :value="4">很难</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">归属课程ID (0表示公共题库)</label>
                <input v-model="form.courseId" type="number" class="w-full border-gray-300 rounded-md shadow-sm" placeholder="请输入课程ID，公共题目请填0" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">题干内容</label>
                <!-- Simplified for brevity, use a proper WYSIWYG editor if available -->
                <textarea v-model="form.content" rows="3" class="w-full border-gray-300 rounded-md shadow-sm" placeholder="请输入题目内容"></textarea>
              </div>

              <!-- Options for Objective types -->
              <div v-if="form.questionType === 1 || form.questionType === 2">
                <div class="flex justify-between items-center mb-2">
                  <label class="block text-sm font-medium text-gray-700">选项设置</label>
                  <button @click="addOption" class="text-sm text-blue-600 hover:text-blue-800">添加选项</button>
                </div>
                <div v-for="(opt, index) in localOptions" :key="index" class="flex items-center space-x-2 mb-2">
                  <span class="font-bold w-6 text-center">{{ String.fromCharCode(65 + index) }}</span>
                  <input v-model="opt.content" type="text" class="flex-1 border-gray-300 rounded-md shadow-sm" placeholder="选项内容">
                  <label class="flex items-center space-x-1 whitespace-nowrap">
                    <input :type="form.questionType === 1 ? 'radio' : 'checkbox'" :checked="opt.isCorrect" @change="e => handleOptionCheck(index, (e.target as HTMLInputElement).checked)" :name="form.questionType === 1 ? 'single-opt' : ''" class="rounded text-blue-600">
                    <span class="text-sm text-gray-700">设为答案</span>
                  </label>
                  <button @click="removeOption(index)" class="text-red-500 hover:text-red-700 text-xl font-bold ml-2">×</button>
                </div>
              </div>

              <!-- True/False -->
              <div v-if="form.questionType === 3">
                <label class="block text-sm font-medium text-gray-700 mb-2">判断答案</label>
                <div class="flex space-x-4">
                  <label class="flex items-center space-x-2">
                    <input type="radio" value="正确" v-model="form.correctAnswer" class="text-blue-600"><span>正确</span>
                  </label>
                  <label class="flex items-center space-x-2">
                    <input type="radio" value="错误" v-model="form.correctAnswer" class="text-blue-600"><span>错误</span>
                  </label>
                </div>
              </div>

              <!-- Fill in blanks -->
              <div v-if="form.questionType === 4">
                <label class="block text-sm font-medium text-gray-700 mb-1">标准答案</label>
                <input v-model="form.correctAnswer" type="text" class="w-full border-gray-300 rounded-md shadow-sm" placeholder="请输入填空题正确答案">
              </div>

              <!-- Short Answer -->
              <div v-if="form.questionType === 5">
                <label class="block text-sm font-medium text-gray-700 mb-1">参考答案</label>
                <textarea v-model="form.referenceAnswer" rows="3" class="w-full border-gray-300 rounded-md shadow-sm" placeholder="请输入主观题参考答案"></textarea>
              </div>

              <!-- Analysis -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">题目解析</label>
                <textarea v-model="form.analysis" rows="2" class="w-full border-gray-300 rounded-md shadow-sm" placeholder="（选填）作答提示或系统评语..."></textarea>
              </div>

            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button @click="handleSave" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
              保存
            </button>
            <button @click="dialogVisible = false" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Score Config Dialog -->
    <div v-if="scoreConfigVisible" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full sm:p-6">
        <div>
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">题型默认分值配置</h3>
          <div class="mt-2 space-y-4">
            <div class="p-3 bg-blue-50 text-blue-700 text-sm rounded border border-blue-100">
              当教师使用“智能抽题”或从题库选取题目组卷时，这些分数将作为题目的默认单题得分。
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">单选题</label>
                <input v-model.number="scoreConfig['1']" type="number" class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">多选题</label>
                <input v-model.number="scoreConfig['2']" type="number" class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">判断题</label>
                <input v-model.number="scoreConfig['3']" type="number" class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">填空题</label>
                <input v-model.number="scoreConfig['4']" type="number" class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">简答题</label>
                <input v-model.number="scoreConfig['5']" type="number" class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
          <button @click="handleSaveScoreConfig" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
            保存设置
          </button>
          <button @click="scoreConfigVisible = false" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            取消
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getQuestionList, createQuestion, updateQuestion, deleteQuestion, downloadTemplate, importQuestions } from '@/api/question'
import type { QuestionItem, QuestionQuery, QuestionOption } from '@/api/question'
import { getExamDefaultScores, updateExamDefaultScores } from '@/api/report'
import { Message } from '@arco-design/web-vue'

const tableData = ref<QuestionItem[]>([])
const total = ref(0)
const queryParams = ref<QuestionQuery>({
  pageNum: 1,
  pageSize: 10,
  questionType: undefined,
  difficulty: undefined,
  keyword: ''
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref<Partial<QuestionItem>>({})
const localOptions = ref<{content: string, isCorrect: boolean}[]>([])

const fetchList = async () => {
  try {
    const res = await getQuestionList(queryParams.value) as any
    tableData.value = res?.list || res?.records || []
    total.value = res?.total || 0
  } catch (error) {
    console.error('获取列表失败', error)
  }
}

const handleSearch = () => {
  queryParams.value.pageNum = 1
  fetchList()
}

const resetQuery = () => {
  queryParams.value = {
    pageNum: 1,
    pageSize: 10,
    questionType: undefined,
    difficulty: undefined,
    keyword: ''
  }
  fetchList()
}

const handlePageChange = (p: number) => {
  queryParams.value.pageNum = p
  fetchList()
}

const openDialog = (item?: QuestionItem) => {
  if (item) {
    isEdit.value = true
    form.value = { ...item }
    if ((item.questionType === 1 || item.questionType === 2) && item.options) {
      localOptions.value = item.options.map(o => ({ content: o.content, isCorrect: o.isCorrect }))
    } else {
      localOptions.value = [
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false }
      ]
    }
    if (item.questionType === 3) {
      const correctOpt = item.options?.find(o => o.isCorrect)
      form.value.correctAnswer = correctOpt?.content || '正确'
    }
  } else {
    isEdit.value = false
    form.value = {
      questionType: 1,
      difficulty: 1,
      courseId: 0,
      content: '',
      analysis: ''
    }
    localOptions.value = [
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false }
    ]
  }
  dialogVisible.value = true
}

const addOption = () => {
  localOptions.value.push({ content: '', isCorrect: false })
}

const removeOption = (index: number) => {
  localOptions.value.splice(index, 1)
}

const handleOptionCheck = (index: number, checked: boolean) => {
  if (form.value.questionType === 1) {
    localOptions.value.forEach((o, i) => o.isCorrect = i === index)
  } else {
    localOptions.value[index].isCorrect = checked
  }
}

const handleSave = async () => {
  if (!form.value.content) {
    Message.warning('请输入题目内容')
    return
  }

  // 组装提交数据
  const submitData: any = { ...form.value }
  
  if (submitData.questionType === 1 || submitData.questionType === 2) {
    submitData.options = localOptions.value.map((o, idx) => ({
      optionLabel: String.fromCharCode(65 + idx),
      content: o.content,
      isCorrect: o.isCorrect,
      sortOrder: idx + 1
    }))
  } else if (submitData.questionType === 3) {
    // 判断题使用 options 表示正确和错误
    const isTrue = submitData.correctAnswer === '正确'
    submitData.options = [
      { optionLabel: 'A', content: '正确', isCorrect: isTrue, sortOrder: 1 },
      { optionLabel: 'B', content: '错误', isCorrect: !isTrue, sortOrder: 2 }
    ]
  }

  // 确保 courseId 为数字
  submitData.courseId = Number(submitData.courseId || 0)

  try {
    if (isEdit.value && form.value.id) {
      await updateQuestion(form.value.id, submitData)
      Message.success('修改成功')
    } else {
      await createQuestion(submitData)
      Message.success('录入成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (error) {
    Message.error('保存失败')
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('确定删除该题目吗？')) return
  try {
    await deleteQuestion(id)
    Message.success('删除成功')
    fetchList()
  } catch (error) {
    Message.error('删除失败')
  }
}

// 分值配置相关逻辑
const scoreConfigVisible = ref(false)
const scoreConfig = ref<Record<string, number>>({})

const openScoreConfig = async () => {
  try {
    Message.loading('读取配置中...')
    const res = await getExamDefaultScores()
    scoreConfig.value = (res as any) || { '1': 5, '2': 5, '3': 5, '4': 5, '5': 10 }
    scoreConfigVisible.value = true
  } catch (err) {
    Message.error('读取配置失败')
  }
}

const handleSaveScoreConfig = async () => {
  try {
    Message.loading('保存中...')
    await updateExamDefaultScores(scoreConfig.value)
    Message.success('默认分值配置已保存')
    scoreConfigVisible.value = false
  } catch (err) {
    Message.error('保存配置失败')
  }
}


const handleDownloadTemplate = () => {
  downloadTemplate()
}

const handleImport = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files?.length) return
  const file = target.files[0]
  try {
    Message.loading('导入中...')
    await importQuestions(file)
    Message.success('导入成功')
    fetchList()
  } catch (error) {
    Message.error('导入失败')
  } finally {
    target.value = ''
  }
}

const getTypeName = (type: number) => {
  const map: Record<number, string> = { 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' }
  return map[type] || '未知'
}

const getDifficultyName = (level: number) => {
  const map: Record<number, string> = { 1: '简单', 2: '中等', 3: '困难', 4: '很难', 5: '极难' }
  return map[level] || '未知'
}
const getDifficultyClass = (level: number) => {
  return level <= 1 ? 'bg-green-100 text-green-800' : level <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
}

onMounted(() => {
  fetchList()
})
</script>
