<template>
  <div class="subject-manage-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">学科分类管理</h2>
        <p class="page-desc">管理课程的学科分类标签，配置可用选项</p>
      </div>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openDialog()">
        新增学科
      </el-button>
    </div>

    <!-- 搜索 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="query" inline>
        <el-form-item label="学科名称">
          <el-input
            v-model="query.keyword"
            placeholder="搜索学科名称"
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
      <el-table :data="tableData" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="学科名称" min-width="150" />
        <el-table-column prop="sortOrder" label="排序号" width="100" />
        <el-table-column prop="isEnabled" label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.isEnabled"
              :active-value="1"
              :inactive-value="0"
              @change="(val) => handleStatusChange(row, val as number)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
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

      <div class="pagination-wrapper">
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
      :title="editingId ? '编辑学科分类' : '新增学科分类'"
      width="400px"
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
        <el-form-item label="学科名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入学科名称" maxlength="30" show-word-limit />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  getSubjectPage,
  createSubject,
  updateSubject,
  deleteSubject,
  updateSubjectStatus
} from '@/api/subject'
import type { SubjectCategory, SubjectCategoryReq } from '@/api/subject'

// ───── 状态 ─────
const loading = ref(false)
const tableData = ref<SubjectCategory[]>([])
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
    const res = await getSubjectPage(query)
    tableData.value = res.list || res.records || []
    total.value = res.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '获取列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  fetchData()
}

// ───── 状态切换 ─────
async function handleStatusChange(row: SubjectCategory, val: number) {
  try {
    await updateSubjectStatus(row.id, val)
    ElMessage.success('状态更新成功')
  } catch (error: any) {
    // 恢复原来的状态
    row.isEnabled = val === 1 ? 0 : 1
    ElMessage.error(error.message || '状态更新失败')
  }
}

// ───── 删除 ─────
async function handleDelete(row: SubjectCategory) {
  try {
    await deleteSubject(row.id)
    ElMessage.success('删除成功')
    if (tableData.value.length === 1 && query.pageNum > 1) {
      query.pageNum--
    }
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

const formData = reactive<SubjectCategoryReq>({
  name: '',
  sortOrder: 100,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入学科名称', trigger: 'blur' }],
  sortOrder: [{ required: true, message: '请设置排序号', trigger: 'blur' }],
}

function openDialog(row?: SubjectCategory) {
  if (row) {
    editingId.value = row.id
    formData.name = row.name
    formData.sortOrder = row.sortOrder
  } else {
    editingId.value = ''
    formData.name = ''
    formData.sortOrder = 100
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
    if (editingId.value) {
      await updateSubject(editingId.value, formData)
      ElMessage.success('修改成功')
    } else {
      await createSubject(formData)
      ElMessage.success('添加成功')
    }
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
