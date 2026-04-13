<template>
  <div class="question-bank-page">
    <div class="page-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="title-wrap">
          <h1 class="page-title">题库管理</h1>
          <p class="page-subtitle">管理系统内的所有试题库，支持检索、录入和批量导入。</p>
        </div>
        <div class="action-wrap">
          <el-button @click="handleDownloadTemplate" :icon="Download">下载导入模板</el-button>
          
          <el-upload
            class="upload-btn-wrap"
            :show-file-list="false"
            :auto-upload="false"
            @change="handleImportChange"
          >
            <el-button type="success" :icon="UploadFilled">批量导入(公共)</el-button>
          </el-upload>

          <el-button type="primary" class="red-btn" @click="openDialog()" :icon="Plus">手工录入</el-button>
          <el-button type="warning" plain @click="openScoreConfig()" :icon="Setting">分值设置</el-button>
        </div>
      </div>

      <!-- Filters Section -->
      <el-card class="filter-card" shadow="never">
        <div class="filter-wrap">
          <!-- 题库类型筛选 -->
          <el-select v-model="queryParams.bankType" placeholder="题库类型" clearable @change="handleSearch" style="width: 140px">
            <el-option label="全部类型" :value="0" />
            <el-option label="公共题库" :value="1" />
            <el-option label="非公共题库" :value="2" />
          </el-select>

          <!-- 学科领域筛选 -->
          <el-select v-model="queryParams.categoryId" placeholder="学科领域" clearable @change="handleSearch" style="width: 160px">
            <el-option label="未分类" value="unclassified" />
            <el-option v-for="item in subjectList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>

          <!-- 核心素养筛选 -->
          <el-select v-model="queryParams.dimensions" placeholder="核心素养" multiple collapse-tags collapse-tags-indicator @change="handleSearch" style="width: 200px">
            <el-option v-for="item in dimensionList" :key="item.id" :label="item.name" :value="String(item.id)" />
          </el-select>

          <el-select v-model="queryParams.questionType" placeholder="全部题型" clearable @change="handleSearch" style="width: 140px">
            <el-option label="单选题" :value="1" />
            <el-option label="多选题" :value="2" />
            <el-option label="判断题" :value="3" />
            <el-option label="填空题" :value="4" />
            <el-option label="简答题" :value="5" />
          </el-select>

          <el-select v-model="queryParams.difficulty" placeholder="全部难度" clearable @change="handleSearch" style="width: 140px">
            <el-option label="简单" :value="1" />
            <el-option label="中等" :value="2" />
            <el-option label="困难" :value="3" />
            <el-option label="很难" :value="4" />
          </el-select>

          <el-input 
            v-model="queryParams.keyword" 
            placeholder="搜索题目内容..." 
            clearable
            @keyup.enter="handleSearch"
            style="width: 240px"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>

          <el-button @click="resetQuery">重置</el-button>
        </div>
      </el-card>

      <!-- Table Section -->
      <el-card class="table-card" shadow="never">
        <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
          <el-table-column label="题目内容" min-width="350">
            <template #default="{ row }">
              <div class="question-content-preview" v-html="row.content"></div>
            </template>
          </el-table-column>
          
          <el-table-column label="题型" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small">{{ getTypeName(row.questionType) }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="难度" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="getDifficultyTagType(row.difficulty)" size="small">
                {{ getDifficultyName(row.difficulty) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="学科与素养" width="220">
            <template #default="{ row }">
              <div class="meta-tags">
                <el-tag v-if="row.categoryName" size="small" type="info" effect="dark">{{ row.categoryName }}</el-tag>
                <el-tag v-if="row.dimensionNames" size="small" type="warning" plain>{{ row.dimensionNames }}</el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="题库属性" width="200">
            <template #default="{ row }">
              <el-tag :type="(!row.courseId || row.courseId === '0' || row.courseId === 0) ? 'success' : ''" size="small" effect="plain" class="course-tag">
                {{ row.courseName || '公共题库' }} [ID: {{ row.courseId || 0 }}]
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="130" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row.id!)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="queryParams.pageNum"
            v-model:page-size="queryParams.pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSearch"
            @current-change="fetchList"
          />
        </div>
      </el-card>
    </div>

    <!-- Edit/Create Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑题目' : '手工录入题目'"
      width="850px"
      destroy-on-close
    >
      <el-form :model="form" label-width="120px" label-position="top" v-loading="dialogLoading">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="题型">
              <el-select v-model="form.questionType" placeholder="选择题型" style="width: 100%">
                <el-option label="单选题" :value="1" />
                <el-option label="多选题" :value="2" />
                <el-option label="判断题" :value="3" />
                <el-option label="填空题" :value="4" />
                <el-option label="简答题" :value="5" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="难度">
              <el-select v-model="form.difficulty" placeholder="选择难度" style="width: 100%">
                <el-option label="简单" :value="1" />
                <el-option label="中等" :value="2" />
                <el-option label="困难" :value="3" />
                <el-option label="很难" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="学科领域">
              <el-select v-model="form.categoryId" placeholder="选择学科" style="width: 100%" clearable>
                 <el-option v-for="item in subjectList" :key="item.id" :label="item.name" :value="String(item.id)" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="归属课程ID (0表示公共题库)">
              <el-input-number v-model="form.courseId" :min="0" style="width: 200px" />
              <div class="form-tip">请输入课程ID，公共题目请填0</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="核心素养维度">
              <el-select v-model="selectedDimensions" placeholder="选择素养维度" style="width: 100%" multiple collapse-tags>
                 <el-option v-for="item in dimensionList" :key="item.id" :label="item.name" :value="String(item.id)" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="题干内容">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请输入题目内容" />
        </el-form-item>

        <!-- Options for Objective types -->
        <template v-if="form.questionType === 1 || form.questionType === 2">
          <div class="options-header">
            <span class="label">选项设置</span>
            <el-button type="primary" link @click="addOption" :icon="Plus">添加选项</el-button>
          </div>
          <div v-for="(opt, index) in localOptions" :key="index" class="option-item">
            <span class="opt-label">{{ String.fromCharCode(65 + index) }}</span>
            <el-input v-model="opt.content" placeholder="选项内容" style="flex: 1" />
            <el-checkbox v-model="opt.isCorrect" @change="handleOptionCheck(index, $event as boolean)" class="opt-check">答案</el-checkbox>
            <el-button type="danger" link :icon="Delete" @click="removeOption(index)" />
          </div>
        </template>

        <!-- True/False -->
        <el-form-item v-if="form.questionType === 3" label="判断答案">
          <el-radio-group v-model="form.correctAnswer">
            <el-radio label="正确">正确</el-radio>
            <el-radio label="错误">错误</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- Fill in blanks -->
        <el-form-item v-if="form.questionType === 4" label="标准答案">
          <el-input v-model="form.correctAnswer" placeholder="请输入填空题正确答案" />
        </el-form-item>

        <!-- Short Answer -->
        <el-form-item v-if="form.questionType === 5" label="参考答案">
          <el-input v-model="form.referenceAnswer" type="textarea" :rows="3" placeholder="请输入主观题参考答案" />
        </el-form-item>

        <!-- Analysis -->
        <el-form-item label="题目解析">
          <el-input v-model="form.analysis" type="textarea" :rows="2" placeholder="（选填）作答提示或系统评语..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" class="red-btn" @click="handleSave" :loading="dialogLoading">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Score Config Dialog -->
    <el-dialog
      v-model="scoreConfigVisible"
      title="题型默认分值配置"
      width="500px"
    >
      <div class="score-config-info">
        当教师使用“智能抽题”或从题库选取题目组卷时，这些分数将作为题目的默认单题得分。
      </div>
      <el-form :model="scoreConfig" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单选题">
              <el-input-number v-model="scoreConfig['1']" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="多选题">
              <el-input-number v-model="scoreConfig['2']" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="判断题">
              <el-input-number v-model="scoreConfig['3']" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="填空题">
              <el-input-number v-model="scoreConfig['4']" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="简答题">
              <el-input-number v-model="scoreConfig['5']" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="scoreConfigVisible = false">取消</el-button>
        <el-button type="warning" @click="handleSaveScoreConfig">保存设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { 
  Plus, Search, Setting, Download, 
  UploadFilled, Delete 
} from '@element-plus/icons-vue'
import { getQuestionList, getQuestionDetail, createQuestion, updateQuestion, deleteQuestion, downloadTemplate, importQuestions } from '@/api/question'
import type { QuestionItem, QuestionQuery } from '@/api/question'
import { getExamDefaultScores, updateExamDefaultScores } from '@/api/report'
import { get, post, put, del, upload } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const dialogLoading = ref(false)
const tableData = ref<QuestionItem[]>([])
const total = ref(0)
const queryParams = reactive<QuestionQuery>({
  pageNum: 1,
  pageSize: 10,
  questionType: undefined,
  difficulty: undefined,
  keyword: '',
  bankType: 0,
  categoryId: undefined,
  dimensions: []
})

const subjectList = ref<any[]>([])
const dimensionList = ref<any[]>([])
const selectedDimensions = ref<string[]>([])

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getQuestionList(queryParams) as any
    tableData.value = res?.list || res?.records || []
    total.value = res?.total || 0
  } catch (error) {
    console.error('获取列表失败', error)
  } finally {
    loading.value = false
  }
}

const fetchMeta = async () => {
  try {
    // 获取学科列表
    const subRes = await get<any[]>('/v1/subjects')
    subjectList.value = subRes || []
    // 获取维度列表
    const dimRes = await get<any[]>('/v1/dimensions')
    dimensionList.value = dimRes || []
  } catch (err) {
    console.warn('获取配置元数据失败')
  }
}

const handleSearch = () => {
  queryParams.pageNum = 1
  fetchList()
}

const resetQuery = () => {
  Object.assign(queryParams, {
    pageNum: 1,
    pageSize: 10,
    questionType: undefined,
    difficulty: undefined,
    keyword: '',
    bankType: 0,
    categoryId: undefined,
    dimensions: []
  })
  fetchList()
}

const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref<Partial<QuestionItem>>({})
const localOptions = ref<{content: string, isCorrect: boolean}[]>([])

const openDialog = async (item?: QuestionItem) => {
  if (item) {
    isEdit.value = true
    dialogVisible.value = true
    dialogLoading.value = true
    try {
      // 核心修复：编辑时从详情接口拉取完整数据（含选项）
      const detail = await getQuestionDetail(item.id!)
      form.value = { ...detail }
      
      // 处理维度选中
      if (detail.dimensions) {
        selectedDimensions.value = detail.dimensions.split(',').map(s => s.trim())
      } else {
        selectedDimensions.value = []
      }

      // 处理选项
      if ((detail.questionType === 1 || detail.questionType === 2) && detail.options) {
        localOptions.value = detail.options.map(o => ({ content: o.content, isCorrect: !!o.isCorrect }))
      } else {
        localOptions.value = [
          { content: '', isCorrect: false },
          { content: '', isCorrect: false }
        ]
      }
      if (detail.questionType === 3) {
        const correctOpt = detail.options?.find(o => o.isCorrect)
        form.value.correctAnswer = correctOpt?.content || '正确'
      }
    } catch (err) {
      ElMessage.error('获取题目详情失败')
      dialogVisible.value = false
    } finally {
      dialogLoading.value = false
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
    selectedDimensions.value = []
    localOptions.value = [
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false }
    ]
    dialogVisible.value = true
  }
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
    ElMessage.warning('请输入题目内容')
    return
  }

  const submitData: any = { ...form.value }
  
  // 处理维度
  submitData.dimensions = selectedDimensions.value.join(',')

  if (submitData.questionType === 1 || submitData.questionType === 2) {
    submitData.options = localOptions.value.map((o, idx) => ({
      optionLabel: String.fromCharCode(65 + idx),
      content: o.content,
      isCorrect: o.isCorrect,
      sortOrder: idx + 1
    }))
  } else if (submitData.questionType === 3) {
    const isTrue = submitData.correctAnswer === '正确'
    submitData.options = [
      { optionLabel: 'A', content: '正确', isCorrect: isTrue, sortOrder: 1 },
      { optionLabel: 'B', content: '错误', isCorrect: !isTrue, sortOrder: 2 }
    ]
  }

  submitData.courseId = Number(submitData.courseId || 0)

  try {
    if (isEdit.value && form.value.id) {
      await updateQuestion(form.value.id, submitData)
      ElMessage.success('修改成功')
    } else {
      await createQuestion(submitData)
      ElMessage.success('录入成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const handleDelete = (id: string) => {
  ElMessageBox.confirm('确定删除该题目吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await deleteQuestion(id)
      ElMessage.success('删除成功')
      fetchList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const scoreConfigVisible = ref(false)
const scoreConfig = ref<Record<string, number>>({})

const openScoreConfig = async () => {
  try {
    const res = await getExamDefaultScores()
    scoreConfig.value = (res as any) || { '1': 5, '2': 5, '3': 5, '4': 5, '5': 10 }
    scoreConfigVisible.value = true
  } catch (err) {
    ElMessage.error('读取配置失败')
  }
}

const handleSaveScoreConfig = async () => {
  try {
    await updateExamDefaultScores(scoreConfig.value)
    ElMessage.success('默认分值配置已保存')
    scoreConfigVisible.value = false
  } catch (err) {
    ElMessage.error('保存配置失败')
  }
}

const handleDownloadTemplate = () => {
  downloadTemplate()
}

const handleImportChange = async (file: any) => {
  if (!file || !file.raw) return
  try {
    // 强制传 0 表示公共题库
    await importQuestions(file.raw, '0')
    ElMessage.success('导入成功')
    fetchList()
  } catch (error) {
     ElMessage.error('导入失败')
  }
}

const getTypeName = (type: number) => {
  return ({ 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' } as any)[type] || '未知'
}

const getDifficultyName = (level: number) => {
  return ({ 1: '简单', 2: '中等', 3: '困难', 4: '很难', 5: '极难' } as any)[level] || '未知'
}

const getDifficultyTagType = (level: any) => {
  const val = Number(level)
  if (isNaN(val) || val <= 1) return 'success'
  if (val <= 2) return ''
  if (val <= 3) return 'warning'
  return 'danger'
}

onMounted(() => {
  fetchMeta()
  fetchList()
})
</script>

<style scoped>
.question-bank-page {
  min-height: 100vh;
  background-color: #f8fafc;
  padding: 24px;
}

.page-container {
  max-width: 1300px;
  margin: 0 auto;
}

/* Header Section */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 4px 0 0;
}

.action-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
}

.upload-btn-wrap {
  display: inline-block;
}

.red-btn {
  background-color: #d32f2f !important;
  border-color: #d32f2f !important;
}
.red-btn:hover {
  background-color: #b71c1c !important;
  border-color: #b71c1c !important;
  opacity: 0.9;
}

/* Filter Card */
.filter-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.filter-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* Table Card */
.table-card {
  border-radius: 8px;
}

.question-content-preview {
  font-size: 14px;
  color: #334155;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.course-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* Form Styles */
.form-tip {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.2;
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 10px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.options-header .label {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.opt-label {
  font-weight: 800;
  color: #d32f2f;
  width: 24px;
  text-align: center;
}

.opt-check {
  margin-right: 0;
}

.score-config-info {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}
</style>
