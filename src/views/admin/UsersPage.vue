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
        <!-- 导出 -->
        <el-button :icon="DocumentExport" :loading="exportLoading" @click="handleExport">
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
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 110px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
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
              :key="role"
              size="small"
              :type="roleTagType(role)"
              class="role-tag"
            >
              {{ ROLE_LABEL[role] ?? role }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="联系方式" min-width="160">
          <template #default="{ row }">
            <div class="contact-cell">
              <span v-if="row.phone">📱 {{ maskPhone(row.phone) }}</span>
              <span v-if="row.email" class="email">✉ {{ row.email }}</span>
              <span v-if="!row.phone && !row.email" class="none">—</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="所属学校" prop="schoolName" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.schoolName || '—' }}</template>
        </el-table-column>

        <el-table-column label="注册时间" width="150">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
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
          @current-change="handleSearch"
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
            <el-tag size="small" :type="roleTagType(drawerUser.roles?.[0])" style="margin-top:4px">
              {{ ROLE_LABEL[drawerUser.roles?.[0]] ?? drawerUser.roles?.[0] }}
            </el-tag>
          </div>
        </div>
        <el-descriptions :column="1" border size="small" class="drawer-desc">
          <el-descriptions-item label="用户名">{{ drawerUser.username }}</el-descriptions-item>
          <el-descriptions-item label="真实姓名">{{ drawerUser.realName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ maskPhone(drawerUser.phone) }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ drawerUser.email || '—' }}</el-descriptions-item>
          <el-descriptions-item label="所属学校">{{ drawerUser.schoolName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="账号状态">
            <el-tag :type="drawerUser.status === 1 ? 'success' : 'danger'" size="small">
              {{ drawerUser.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(drawerUser.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        <div class="drawer-actions">
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
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRawFile } from 'element-plus'
import {
  Search, Refresh, Download, Upload, DocumentExport, View, Key,
} from '@element-plus/icons-vue'
import {
  getUserList, getUserDetail, updateUserStatus,
  resetUserPassword, importUsers, getAllRoles,
} from '@/api/user'
import { ROLE_LABEL } from '@/constants'
import type { UserManageItem, UserManageQuery } from '@/types/user'

// ───── 状态 ─────
const loading = ref(false)
const importLoading = ref(false)
const exportLoading = ref(false)
const tableData = ref<(UserManageItem & { _toggling?: boolean })[]>([])
const total = ref(0)
const allRoles = ref<{ id: string; roleName: string; roleCode: string }[]>([])

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

// ───── 角色标签颜色 ─────
function roleTagType(role?: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    ADMIN: 'danger',
    SCHOOL_LEADER: 'warning',
    TEACHER: '',
    ASSISTANT: 'info',
    STUDENT: 'success',
  }
  return role ? (map[role] ?? 'info') : 'info'
}

// ───── 工具函数 ─────
function maskPhone(phone?: string): string {
  if (!phone) return '—'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return dateStr.slice(0, 10)
}

// ───── 加载数据 ─────
async function fetchList() {
  loading.value = true
  try {
    const res = await getUserList(query)
    tableData.value = res.records
    total.value = res.total
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
  ).catch(() => { throw new Error('cancel') })

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
  ).catch(() => { throw new Error('cancel') })

  const res = await resetUserPassword(row.userId)
  ElMessageBox.alert(
    `新密码：<b style="font-size:18px;color:#d32f2f">${res.newPassword}</b><br/><small>请告知用户妥善保管</small>`,
    '密码已重置',
    { dangerouslyUseHTMLString: true, type: 'success', confirmButtonText: '知道了' },
  )
}

// ───── 查看详情 ─────
async function handleViewDetail(row: UserManageItem) {
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
function handleDownloadTemplate() {
  // 直接触发后端下载流
  const token = localStorage.getItem('edu-auth')
    ? JSON.parse(localStorage.getItem('edu-auth')!).token
    : ''
  const url = `/api/v1/users/manage/template`
  const a = document.createElement('a')
  a.href = url
  a.download = '用户导入模板.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
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
onMounted(async () => {
  // 并行加载：用户列表 + 所有角色
  const [, roles] = await Promise.all([fetchList(), getAllRoles()])
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
</style>
