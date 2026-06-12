<template>
  <div class="users-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">用户管理</h2>
        <p class="page-desc">管理平台所有注册用户，支持批量导入、状态管理和密码重置</p>
      </div>
      <div class="header-actions">
        <!-- 下载模板 -->
        <el-button :icon="Download" @click="handleDownloadTemplate">下载模板</el-button>
        <!-- 批量导入 -->
        <el-upload
          :show-file-list="false"
          :before-upload="handleImport"
          accept=".xlsx,.xls"
        >
          <el-button :icon="Upload" :loading="importLoading">批量导入</el-button>
        </el-upload>
        <!-- 新增用户 -->
        <el-button type="primary" :icon="Plus" @click="createDialogVisible = true">新增用户</el-button>
        <!-- 导出 -->
        <el-button :icon="Download" :loading="exportLoading" @click="handleExport">
          导出列表
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="query" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="query.username"
            placeholder="用户名 / 真实姓名"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="query.phone"
            placeholder="手机号"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="query.roleId" placeholder="全部角色" clearable style="width: 120px">
            <el-option
              v-for="r in allRoles"
              :key="r.id"
              :label="r.roleName"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="院系">
          <el-input
            v-model="query.department"
            placeholder="所属院系"
            clearable
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item label="班级">
          <el-input
            v-model="query.className"
            placeholder="所属班级"
            clearable
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item v-if="authStore.isAdmin" label="学校">
          <el-select v-model="query.schoolId" placeholder="全部学校" clearable style="width: 150px">
            <el-option
              v-for="s in schoolList"
              :key="s.id"
              :label="s.schoolName"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="userId"
        stripe
        style="width: 100%"
      >
        <el-table-column type="selection" width="44" />

        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="row.avatar" class="cell-avatar">
                {{ row.realName?.charAt(0) || row.username?.charAt(0) }}
              </el-avatar>
              <div class="cell-info">
                <div class="cell-name">{{ row.realName || row.username }}</div>
                <div class="cell-sub">@{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag
              v-for="role in row.roles"
              :key="role.roleId"
              size="small"
              :type="roleTagType(role.roleCode)"
              class="role-tag"
            >
              {{ role.roleName }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="联系方式" min-width="160">
          <template #default="{ row }">
            <div class="contact-cell">
              <span v-if="row.phone">📱 {{ row.phone }}</span>
              <span v-if="row.email" class="email">✉ {{ row.email }}</span>
              <span v-if="!row.phone && !row.email" class="none">—</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column v-if="authStore.isAdmin" label="所属学校" prop="schoolName" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.schoolName || '—' }}</template>
        </el-table-column>

        <el-table-column label="院系/班级" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.department || row.className" class="school-info-cell">
              <span v-if="row.department">{{ row.department }}</span>
              <span v-if="row.className" class="class-tag">{{ row.className }}</span>
            </div>
            <span v-else>—</span>
          </template>
        </el-table-column>

        <el-table-column label="注册时间" width="150">
          <template #default="{ row }">{{ formatDate(row.createdTime) }}</template>
        </el-table-column>

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="row._toggling"
              active-color="#d32f2f"
              @change="(val: boolean) => handleToggleStatus(row, val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :icon="View"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              text
              type="danger"
              size="small"
              :icon="Key"
              @click="handleResetPwd(row)"
            >
              重置密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSearch"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 用户详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="用户详情"
      size="400px"
      direction="rtl"
    >
      <div v-if="drawerUser" class="drawer-content">
        <div class="drawer-avatar-row">
          <el-avatar :size="72" :src="drawerUser.avatar">
            {{ drawerUser.realName?.charAt(0) }}
          </el-avatar>
          <div>
            <div class="drawer-name">{{ drawerUser.realName || drawerUser.username }}</div>
            <el-tag size="small" :type="roleTagType(drawerUser.roles?.[0]?.roleCode)" style="margin-top:4px">
              {{ drawerUser.roles?.[0]?.roleName || '—' }}
            </el-tag>
          </div>
        </div>
        <!-- 展示模式 -->
        <el-descriptions v-if="!isEditing" :column="1" border size="small" class="drawer-desc">
          <el-descriptions-item label="用户名">{{ drawerUser.username }}</el-descriptions-item>
          <el-descriptions-item label="真实姓名">{{ drawerUser.realName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ drawerUser.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ drawerUser.email || '—' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ drawerUser.gender === 1 ? '男' : (drawerUser.gender === 2 ? '女' : '未知') }}</el-descriptions-item>
          <el-descriptions-item label="学号/工号">{{ drawerUser.studentNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="所属学校">{{ drawerUser.schoolName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="院系部门">{{ drawerUser.department || '—' }}</el-descriptions-item>
          <el-descriptions-item label="所在班级">{{ drawerUser.className || '—' }}</el-descriptions-item>
          <el-descriptions-item label="账号状态">
            <el-tag :type="drawerUser.status === 1 ? 'success' : 'danger'" size="small">
              {{ drawerUser.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(drawerUser.createdTime) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 编辑模式 -->
        <el-form v-else :model="editForm" label-width="90px" size="small">
          <el-form-item label="用户名">
            <el-input v-model="editForm.username" />
          </el-form-item>
          <el-form-item label="头像">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :http-request="customUploadAvatar"
              accept="image/*"
            >
              <img v-if="editForm.avatarUrl" :src="editForm.avatarUrl" class="avatar-preview" />
              <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            </el-upload>
          </el-form-item>
          <el-form-item label="真实姓名">
            <el-input v-model="editForm.realName" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="editForm.phone" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="editForm.email" />
          </el-form-item>
          <el-form-item label="性别">
            <el-select v-model="editForm.gender" style="width: 100%" clearable>
              <el-option label="男" :value="1" />
              <el-option label="女" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="所属学校" v-if="authStore.isAdmin">
            <el-select v-model="editForm.schoolName" style="width: 100%" clearable>
              <el-option v-for="s in schoolList" :key="s.id" :label="s.schoolName" :value="s.schoolName" />
            </el-select>
          </el-form-item>
          <el-form-item label="学号/工号">
            <el-input v-model="editForm.studentNo" />
          </el-form-item>
          <el-form-item label="院系部门">
            <el-input v-model="editForm.department" />
          </el-form-item>
          <el-form-item label="所在班级">
            <el-input v-model="editForm.className" />
          </el-form-item>
        </el-form>

        <div class="drawer-actions" v-if="!isEditing">
          <el-button type="primary" plain :icon="Edit" @click="enterEdit">
            编辑信息
          </el-button>
          <el-button
            :type="drawerUser.status === 1 ? 'danger' : 'success'"
            plain
            @click="handleToggleStatus(drawerUser, drawerUser.status !== 1)"
          >
            {{ drawerUser.status === 1 ? '禁用账号' : '启用账号' }}
          </el-button>
          <el-button type="warning" plain :icon="Key" @click="handleResetPwd(drawerUser)">
            重置密码
          </el-button>
        </div>
        <div class="drawer-actions" v-else>
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="primary" :loading="editLoading" @click="saveEdit">保存修改</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 新增用户弹窗 -->
    <el-dialog v-model="createDialogVisible" title="新增用户" width="560px" :close-on-click-modal="false" @closed="resetCreateForm">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="createForm.username" placeholder="登录账号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="createForm.password" placeholder="默认 123456" show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="真实姓名" prop="realName">
              <el-input v-model="createForm.realName" placeholder="真实姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="createForm.phone" placeholder="手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色" prop="roleCode">
              <el-select v-model="createForm.roleCode" placeholder="选择角色" style="width:100%">
                <el-option v-for="r in allRoles" :key="r.roleCode" :label="r.roleName" :value="r.roleCode" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="createForm.gender" placeholder="性别" style="width:100%" clearable>
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="authStore.isAdmin">
            <el-form-item label="学校名称">
              <el-select v-model="createForm.schoolName" placeholder="选择学校" style="width:100%" clearable>
                <el-option v-for="s in schoolList" :key="s.id" :label="s.schoolName" :value="s.schoolName" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学号/工号">
              <el-input v-model="createForm.studentNo" placeholder="学号或工号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="院系">
              <el-input v-model="createForm.department" placeholder="所属院系" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班级">
              <el-input v-model="createForm.className" placeholder="所在班级" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业">
              <el-input v-model="createForm.major" placeholder="所学专业" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="createForm.email" placeholder="邮箱（选填）" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateUser">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRawFile, FormInstance } from 'element-plus'
import {
  Search, Refresh, Download, Upload, View, Key, Plus, Edit,
} from '@element-plus/icons-vue'
import {
  getUserList, getUserDetail, updateUserStatus,
  resetUserPassword, importUsers, getAllRoles, downloadUserTemplate, createUser, updateUserInfo, uploadAvatar,
} from '@/api/user'
import { getSchoolList } from '@/api/school'
import { ROLE_LABEL } from '@/constants'
import { useAuthStore } from '@/stores/auth'
import type { UserManageItem, UserManageQuery } from '@/types/user'

const authStore = useAuthStore()

// ───── 状态 ─────
const loading = ref(false)
const importLoading = ref(false)
const exportLoading = ref(false)
const createLoading = ref(false)
const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const tableData = ref<(UserManageItem & { _toggling?: boolean })[]>([])
const total = ref(0)
const allRoles = ref<{ id: string; roleName: string; roleCode: string }[]>([])
const schoolList = ref<any[]>([])

// ───── 新增用户表单 ─────
const createForm = reactive({
  username: '',
  password: '',
  realName: '',
  phone: '',
  email: '',
  gender: '',
  roleCode: '',
  studentNo: '',
  schoolName: '',
  department: '',
  className: '',
  major: '',
})

const createRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  roleCode: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// ───── 查询参数 ─────
const query = reactive<UserManageQuery>({
  username: '',
  phone: '',
  roleId: undefined,
  status: undefined,
  pageNum: 1,
  pageSize: 10,
})

// ───── 详情抽屉 ─────
const drawerVisible = ref(false)
const drawerUser = ref<UserManageItem | null>(null)

// ───── 编辑信息 ─────
const isEditing = ref(false)
const editLoading = ref(false)
const editForm = reactive({
  username: '',
  avatarUrl: '',
  realName: '',
  phone: '',
  email: '',
  gender: undefined as number | undefined,
  schoolName: '',
  studentNo: '',
  department: '',
  className: '',
})

function enterEdit() {
  if (!drawerUser.value) return
  isEditing.value = true
  Object.assign(editForm, {
    username: drawerUser.value.username || '',
    avatarUrl: drawerUser.value.avatar || '',
    realName: drawerUser.value.realName || '',
    phone: drawerUser.value.phone || '',
    email: drawerUser.value.email || '',
    gender: drawerUser.value.gender,
    schoolName: drawerUser.value.schoolName || '',
    studentNo: drawerUser.value.studentNo || '',
    department: drawerUser.value.department || '',
    className: drawerUser.value.className || '',
  })
}

function cancelEdit() {
  isEditing.value = false
}

async function customUploadAvatar(options: any) {
  if (!drawerUser.value) return
  try {
    const res = await uploadAvatar(options.file, String(drawerUser.value.userId))
    editForm.avatarUrl = res.url
    ElMessage.success('头像上传成功')
  } catch (err: any) {
    ElMessage.error(err.message || '上传失败')
  }
}

async function saveEdit() {
  if (!drawerUser.value) return
  await ElMessageBox.confirm('确定要保存修改吗？', '提示', { type: 'warning' }).catch(() => { throw new Error('cancel') })
  editLoading.value = true
  try {
    const payload = { ...editForm }
    if (payload.gender === '' as any) {
      payload.gender = undefined
    }
    await updateUserInfo(drawerUser.value.userId, payload)
    ElMessage.success('修改成功')
    isEditing.value = false
    // 重新获取详情和列表
    drawerUser.value = await getUserDetail(drawerUser.value.userId)
    fetchList()
  } catch (err: any) {
    if (err.message !== 'cancel') {
      console.error(err)
    }
  } finally {
    editLoading.value = false
  }
}

// ───── 角色标签颜色 ─────
function roleTagType(role?: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    ADMIN: 'danger',
    SCHOOL_LEADER: 'warning',
    TEACHER: 'primary',
    ASSISTANT: 'info',
    STUDENT: 'success',
  }
  return role ? (map[role] ?? 'info') : 'info'
}

// ───── 工具函数 ─────
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return dateStr.slice(0, 10)
}

// ───── 加载数据 ─────
async function fetchList() {
  loading.value = true
  try {
    // 自动带入校领导的学校ID实现数据隔离
    if (authStore.isSchoolLeader && authStore.userInfo?.schoolId) {
      query.schoolId = String(authStore.userInfo.schoolId)
    }
    const res = await getUserList(query)
    tableData.value = res?.list || []
    total.value = res?.total ?? 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  fetchList()
}

function handleReset() {
  Object.assign(query, {
    username: '',
    phone: '',
    roleId: undefined,
    status: undefined,
    department: '',
    className: '',
    schoolId: authStore.isSchoolLeader ? String(authStore.userInfo?.schoolId) : undefined,
    pageNum: 1,
    pageSize: 10,
  })
  fetchList()
}

// ───── 切换状态 ─────
async function handleToggleStatus(row: UserManageItem & { _toggling?: boolean }, enable: boolean) {
  const label = enable ? '启用' : '禁用'
  await ElMessageBox.confirm(
    `确定要 ${label} 用户「${row.realName || row.username}」吗？`,
    '操作确认',
    { type: 'warning', confirmButtonText: label, cancelButtonText: '取消' },
  ).catch(() => { /* 静默退出 */ return })
  if (!row) return // 防止非预期状态进入下一步

  row._toggling = true
  try {
    await updateUserStatus(row.userId, enable ? 1 : 0)
    row.status = enable ? 1 : 0
    if (drawerUser.value?.userId === row.userId) drawerUser.value.status = row.status
    ElMessage.success(`用户已${label}`)
  } finally {
    row._toggling = false
  }
}

// ───── 重置密码 ─────
async function handleResetPwd(row: UserManageItem) {
  await ElMessageBox.confirm(
    `确定要重置用户「${row.realName || row.username}」的密码吗？`,
    '重置密码',
    { type: 'warning', confirmButtonText: '重置', cancelButtonText: '取消' },
  ).catch(() => { /* 静默退出 */ return })
  if (!row) return

  const res = await resetUserPassword(row.userId)
  ElMessageBox.alert(
    `新密码：<b style="font-size:18px;color:#d32f2f">${res.newPassword}</b><br/><small>请告知用户妥善保管</small>`,
    '密码已重置',
    { dangerouslyUseHTMLString: true, type: 'success', confirmButtonText: '知道了' },
  )
}

// ───── 查看详情 ─────
async function handleViewDetail(row: UserManageItem) {
  isEditing.value = false // 重置编辑状态
  drawerUser.value = row
  drawerVisible.value = true
  // 懒加载最新详情
  try {
    drawerUser.value = await getUserDetail(row.userId)
  } catch {
    // 展示列表中的数据即可
  }
}

// ───── 下载模板 ─────
async function handleDownloadTemplate() {
  try {
    const blob = await downloadUserTemplate()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '用户导入模板.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('下载模板失败', err)
    // 错误已由拦截器处理
  }
}

// ───── 批量导入 ─────
async function handleImport(file: UploadRawFile) {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    ElMessage.error('请上传 Excel 文件（.xlsx 或 .xls）')
    return false
  }
  importLoading.value = true
  try {
    const res = await importUsers(file)
    const msg = `导入完成：成功 ${res.successCount} 条，失败 ${res.failCount} 条`
    if (res.failCount > 0) {
      ElMessageBox.alert(
        `${msg}<br/><br/>失败明细：<br/>${res.failDetails.join('<br/>')}`,
        '导入结果',
        { dangerouslyUseHTMLString: true, type: 'warning' },
      )
    } else {
      ElMessage.success(msg)
    }
    fetchList()
  } finally {
    importLoading.value = false
  }
  return false // 阻止自动上传
}

// ───── 新增单个用户 ─────
async function handleCreateUser() {
  if (!createFormRef.value) return
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return
  createLoading.value = true
  try {
    await createUser(createForm)
    ElMessage.success('用户创建成功！')
    createDialogVisible.value = false
    fetchList()
  } finally {
    createLoading.value = false
  }
}

function resetCreateForm() {
  createFormRef.value?.resetFields()
  Object.assign(createForm, {
    username: '', password: '', realName: '', phone: '', email: '',
    gender: '', roleCode: '', studentNo: '', schoolName: '',
    department: '', className: '', major: '',
  })
}

// ───── 导出 ─────
async function handleExport() {
  exportLoading.value = true
  try {
    // 构造带当前筛选条件的导出 URL
    const params = new URLSearchParams()
    if (query.username) params.append('username', query.username)
    if (query.phone) params.append('phone', query.phone)
    if (query.roleId) params.append('roleId', String(query.roleId))
    if (query.status !== undefined) params.append('status', String(query.status))
    if (query.department) params.append('department', query.department)
    if (query.className) params.append('className', query.className)
    // 导出也要带上学校过滤
    if (authStore.isSchoolLeader && authStore.userInfo?.schoolId) {
      params.append('schoolId', String(authStore.userInfo.schoolId))
    }

    const a = document.createElement('a')
    a.href = `/api/v1/users/manage/export?${params}`
    a.download = `用户列表_${new Date().toLocaleDateString()}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    ElMessage.success('导出已开始，请稍候')
  } finally {
    exportLoading.value = false
  }
}

// ───── 初始化 ─────
async function fetchSchools() {
  if (!authStore.isAdmin) return
  const res = await getSchoolList({ pageNum: 1, pageSize: 1000 })
  schoolList.value = res.list || []
}

onMounted(async () => {
  // 并行加载：用户列表 + 所有角色 + 学校列表
  const [, roles] = await Promise.all([fetchList(), getAllRoles(), fetchSchools()])
  allRoles.value = roles
})
</script>

<style scoped>
/* ===== 页头 ===== */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* ===== 筛选卡片 ===== */
.filter-card {
  border-radius: 12px !important;
  margin-bottom: 16px;
}

:deep(.el-card__body) { padding: 16px 20px; }

/* ===== 表格卡片 ===== */
.table-card { border-radius: 12px !important; }

/* ===== 用户列单元格 ===== */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cell-avatar { border: 2px solid #ffcdd2; flex-shrink: 0; }
.cell-name   { font-size: 14px; font-weight: 600; color: #263238; }
.cell-sub    { font-size: 12px; color: #90a4ae; }

/* ===== 联系方式 ===== */
.contact-cell { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.email { color: #546e7a; }
.none  { color: #b0bec5; }

/* ===== 学校/院系/班级 ===== */
.school-info-cell { display: flex; flex-direction: column; gap: 2px; }
.class-tag {
  display: inline-block;
  padding: 0 6px;
  background: #fdf2f2;
  color: #d32f2f;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  width: fit-content;
}

/* ===== 角色标签 ===== */
.role-tag { margin-right: 3px; }

/* ===== Switch 红色主色（全局 CSS 变量覆盖不到 switch 的情况） ===== */
:deep(.el-switch.is-checked .el-switch__core) {
  background: #d32f2f !important;
  border-color: #d32f2f !important;
}

/* ===== 分页 ===== */
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 4px;
}

/* ===== 详情抽屉 ===== */
.drawer-content { padding: 4px 0; display: flex; flex-direction: column; gap: 20px; }

.drawer-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.drawer-name { font-size: 18px; font-weight: 700; color: #263238; }
.drawer-desc { border-radius: 8px; overflow: hidden; }

.drawer-actions { display: flex; gap: 12px; }
/* ===== 表单与上传 ===== */
:deep(.avatar-uploader .el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

:deep(.avatar-uploader .el-upload:hover) {
  border-color: var(--el-color-primary);
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 78px;
  height: 78px;
  text-align: center;
}

.avatar-preview {
  width: 78px;
  height: 78px;
  display: block;
  object-fit: cover;
}

</style>
