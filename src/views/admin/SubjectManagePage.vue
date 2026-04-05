<template>
  <div class="subject-manage-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">学科分类管理</h2>
        <p class="page-desc">
          {{ activeTab === 'course' ? '管理管理课程的学科分类标签，配置可用选项' : '管理资源库的分类层级，支持二级分类' }}
        </p>
      </div>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openDialog()">
        新增{{ activeTab === 'course' ? '学科' : '分类' }}
      </el-button>
    </div>

    <!-- 标签页切换 -->
    <el-tabs v-model="activeTab" class="custom-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="课程学科" name="course" />
      <el-tab-pane label="资源分类" name="resource" />
    </el-tabs>

    <!-- 搜索 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="query" inline>
        <el-form-item :label="activeTab === 'course' ? '学科名称' : '分类名称'">
          <el-input
            v-model="query.keyword"
            :placeholder="activeTab === 'course' ? '搜索学科名称' : '搜索分类名称'"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card class="table-card" shadow="never" v-loading="loading">
      <!-- 课程学科表格 (扁平) -->
      <el-table 
        v-if="activeTab === 'course'" 
        :data="courseSubjects" 
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="100" />
        <el-table-column prop="name" label="学科名称" min-width="150" />
        <el-table-column prop="sortOrder" label="排序号" width="100" align="center" />
        <el-table-column prop="isEnabled" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.isEnabled"
              :active-value="1"
              :inactive-value="0"
              @change="(val) => handleCourseStatusChange(row, val as number)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定要删除该学科吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 资源分类表格 (树形) -->
      <el-table 
        v-else 
        :data="resourceCategories" 
        row-key="id"
        :tree-props="{ children: 'children' }"
        style="width: 100%"
      >
        <el-table-column prop="categoryName" label="分类名称" min-width="200" />
        <el-table-column prop="sortOrder" label="排序号" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="(val) => handleResourceStatusChange(row, val as number)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdTime" label="创建时间" width="180">
          <template #default="{ row }">{{ row.createdTime ? row.createdTime.replace('T', ' ').slice(0, 19) : '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定要删除该分类吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger" :disabled="row.children?.length > 0">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 只有课程列表支持分页 -->
      <div v-if="activeTab === 'course'" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? (activeTab === 'course' ? '编辑学科' : '编辑分类') : (activeTab === 'course' ? '新增学科' : '新增分类')"
      width="450px"
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="90px">
        <el-form-item :label="activeTab === 'course' ? '学科名称' : '分类名称'" prop="name">
          <el-input v-model="formData.name" :placeholder="activeTab === 'course' ? '请输入学科名称' : '请输入分类名称'" maxlength="30" show-word-limit />
        </el-form-item>
        
        <!-- 资源模式下的上级分类选择 -->
        <el-form-item v-if="activeTab === 'resource'" label="上级分类">
          <el-cascader
            v-model="formData.parentId"
            :options="categoryOptions"
            :props="{ value: 'id', label: 'categoryName', children: 'children', checkStrictly: true, emitPath: false }"
            placeholder="留空表示顶级分类"
            clearable
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="排序号" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="1" :max="999" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  getSubjectPage, createSubject, updateSubject, deleteSubject, updateSubjectStatus
} from '@/api/subject'
import {
  getCategoryTree, createCategory, updateCategory, deleteCategory, updateCategoryStatus
} from '@/api/resource'
import type { SubjectCategory } from '@/api/subject'
import type { CategoryNode } from '@/api/resource'

// ───── 状态 ─────
const activeTab = ref<'course' | 'resource'>('course')
const loading = ref(false)
const courseSubjects = ref<SubjectCategory[]>([])
const resourceCategories = ref<CategoryNode[]>([])
const total = ref(0)
const query = reactive({
  keyword: '',
  pageNum: 1,
  pageSize: 10,
})

// ───── 数据获取 ─────
async function fetchData() {
  loading.value = true
  try {
    if (activeTab.value === 'course') {
      const res = await getSubjectPage(query)
      courseSubjects.value = res.list || res.records || []
      total.value = res.total || 0
    } else {
      const res = await getCategoryTree()
      // 树形接口通常不带分页，前端可根据 keyword 过滤或直接展示
      let data = res || []
      if (query.keyword) {
        data = filterTree(data, query.keyword)
      }
      resourceCategories.value = data
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

// 简单的树结构搜索过滤
function filterTree(tree: CategoryNode[], keyword: string): CategoryNode[] {
  const result: CategoryNode[] = []
  for (const node of tree) {
    const children = node.children ? filterTree(node.children, keyword) : []
    if (node.categoryName.includes(keyword) || children.length > 0) {
      result.push({ ...node, children })
    }
  }
  return result
}

function handleTabChange() {
  query.keyword = ''
  query.pageNum = 1
  fetchData()
}

function handleSearch() {
  query.pageNum = 1
  fetchData()
}

// ───── 课程学科状态切换 ─────
async function handleCourseStatusChange(row: SubjectCategory, val: number) {
  try {
    await updateSubjectStatus(row.id, val)
    ElMessage.success('状态更新成功')
  } catch (error: any) {
    row.isEnabled = val === 1 ? 0 : 1
    ElMessage.error(error.message || '状态更新失败')
  }
}

// ───── 资源分类状态切换 ─────
async function handleResourceStatusChange(row: CategoryNode, val: number) {
  try {
    await updateCategoryStatus(row.id, val)
    ElMessage.success('状态更新成功')
  } catch (error: any) {
    // 强制更新视图
    row.status = val === 1 ? 0 : 1
    ElMessage.error(error.message || '状态更新失败')
  }
}

// ───── 删除 ─────
async function handleDelete(row: any) {
  try {
    if (activeTab.value === 'course') {
      await deleteSubject(row.id)
    } else {
      await deleteCategory(row.id)
    }
    ElMessage.success('删除成功')
    fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}

// ───── 弹窗表单 ─────
const dialogVisible = ref(false)
const submitting = ref(false)
const editingId = ref('')
const formRef = ref<FormInstance>()

const formData = reactive({
  name: '',
  sortOrder: 100,
  parentId: undefined as string | undefined,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  sortOrder: [{ required: true, message: '请设置排序号', trigger: 'blur' }],
}

// 资源分类的可选上级（排除自己及其子项这种逻辑在此可简化或通过 Cascader 限制）
const categoryOptions = computed(() => {
  // 过滤掉当前正在编辑的项，防止循环引用
  const filterSelf = (nodes: CategoryNode[]): CategoryNode[] => {
    return nodes
      .filter(n => n.id !== editingId.value)
      .map(n => ({ ...n, children: n.children ? filterSelf(n.children) : [] }))
  }
  return filterSelf(resourceCategories.value)
})

function openDialog(row?: any) {
  if (row) {
    editingId.value = row.id
    formData.name = activeTab.value === 'course' ? row.name : row.categoryName
    formData.sortOrder = row.sortOrder
    formData.parentId = row.parentId === '0' ? undefined : row.parentId
  } else {
    editingId.value = ''
    formData.name = ''
    formData.sortOrder = 100
    formData.parentId = undefined
  }
  dialogVisible.value = true
}

function handleDialogClosed() {
  formRef.value?.resetFields()
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return
  
  submitting.value = true
  try {
    if (activeTab.value === 'course') {
      const payload = { name: formData.name, sortOrder: formData.sortOrder }
      if (editingId.value) {
        await updateSubject(editingId.value, payload)
      } else {
        await createSubject(payload)
      }
    } else {
      const payload = { 
        categoryName: formData.name, 
        sortOrder: formData.sortOrder,
        parentId: formData.parentId || '0'
      }
      if (editingId.value) {
        await updateCategory(editingId.value, payload)
      } else {
        await createCategory(payload)
      }
    }
    ElMessage.success(editingId.value ? '修改成功' : '新增成功')
    dialogVisible.value = false
    fetchData()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.subject-manage-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.page-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #263238;
}
.page-desc {
  margin: 0;
  font-size: 13px;
  color: #78909c;
}

.custom-tabs {
  margin-bottom: -8px;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.filter-card,
.table-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.create-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3) !important;
  transition: all 0.3s;
}
.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(211, 47, 47, 0.4) !important;
}
</style>
