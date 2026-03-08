<template>
  <div class="schools-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">学校管理</h2>
        <p class="page-desc">管理平台接入学校</p>
      </div>
      <el-button type="primary" class="red-btn" :icon="Plus" @click="showCreateDialog = true">添加学校</el-button>
    </div>

    <!-- 搜索栏 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <el-input v-model="query.keyword" placeholder="学校名称关键词" clearable :prefix-icon="Search" style="width:220px" @keyup.enter="handleSearch" @clear="handleSearch" />
        <el-input v-model="query.province" placeholder="省份" clearable style="width:140px" @keyup.enter="handleSearch" />
        <el-button type="primary" class="red-btn" @click="handleSearch">搜索</el-button>
      </div>
    </el-card>

    <!-- 学校列表 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="schools" v-loading="loading" stripe>
        <el-table-column label="学校名称" prop="schoolName" min-width="180" />
        <el-table-column label="省份" prop="province" width="120" />
        <el-table-column label="城市" prop="city" width="120" />
        <el-table-column label="联系方式" prop="contactPhone" width="140" />
        <el-table-column label="创建时间" prop="createdTime" width="160">
          <template #default="{ row }">{{ row.createdTime?.slice(0,10) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="editSchool(row)">编辑</el-button>
            <el-popconfirm title="确定删除该学校？" @confirm="deleteSchoolById(row.id)">
              <template #reference>
                <el-button text size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > query.pageSize"
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        background
        style="margin-top: 16px; justify-content: flex-end; display: flex"
        @change="fetchSchools"
      />
    </el-card>

    <!-- 创建/编辑学校 -->
    <el-dialog v-model="showCreateDialog" :title="editingSchool ? '编辑学校' : '添加学校'" width="480px" :close-on-click-modal="false">
      <el-form :model="form" label-width="90px" size="large">
        <el-form-item label="学校名称" required>
          <el-input v-model="form.schoolName" clearable />
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="form.province" clearable />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="form.city" clearable />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" clearable />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" clearable />
        </el-form-item>
        <el-form-item label="邀请码">
          <el-input v-model="form.inviteCode" clearable placeholder="留空则不限" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" class="red-btn" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { get, post, put, del } from '@/utils/request'
import type { PageResponse } from '@/types/api'

interface SchoolItem {
  id: string
  schoolName: string
  province?: string
  city?: string
  address?: string
  contactPhone?: string
  inviteCode?: string
  createdTime?: string
}

const query = reactive({ keyword: '', province: '', pageNum: 1, pageSize: 15 })
const loading = ref(false)
const schools = ref<SchoolItem[]>([])
const total = ref(0)

async function fetchSchools() {
  loading.value = true
  try {
    const res = await get<PageResponse<SchoolItem>>('/v1/schools', query)
    schools.value = res?.records || []
    total.value = res?.total ?? 0
  } finally { loading.value = false }
}

function handleSearch() { query.pageNum = 1; fetchSchools() }

// ─── 创建/编辑 ───
const showCreateDialog = ref(false)
const submitting = ref(false)
const editingSchool = ref<SchoolItem | null>(null)
const form = reactive({ schoolName: '', province: '', city: '', address: '', contactPhone: '', inviteCode: '' })

function editSchool(s: SchoolItem) {
  editingSchool.value = s
  Object.assign(form, s)
  showCreateDialog.value = true
}

async function handleSubmit() {
  if (!form.schoolName) { ElMessage.warning('请输入学校名称'); return }
  submitting.value = true
  try {
    if (editingSchool.value) {
      await put<void>(`/v1/schools/${editingSchool.value.id}`, form)
      ElMessage.success('已更新')
    } else {
      await post<string>('/v1/schools', form)
      ElMessage.success('已创建')
    }
    showCreateDialog.value = false
    editingSchool.value = null
    Object.assign(form, { schoolName: '', province: '', city: '', address: '', contactPhone: '', inviteCode: '' })
    fetchSchools()
  } finally { submitting.value = false }
}

async function deleteSchoolById(id: string) {
  await del<void>(`/v1/schools/${id}`)
  ElMessage.success('已删除')
  fetchSchools()
}

onMounted(fetchSchools)
</script>

<style scoped>
.schools-page { display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }
.filter-card { border-radius: 14px !important; }
.filter-row  { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.table-card  { border-radius: 14px !important; }
.red-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important; color: #fff !important;
}
</style>
