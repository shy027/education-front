<template>
  <div class="resources-mgmt-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">资源审核管理</h2>
        <p class="page-desc">管理员审核教师提交的资源，控制资源库内容质量</p>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input v-model="query.keyword" placeholder="资源标题关键词" clearable :prefix-icon="Search" style="width:220px" @keyup.enter="handleSearch" @clear="handleSearch" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width:130px" @change="handleSearch">
          <el-option label="全部" :value="undefined" />
          <el-option label="待审核" :value="1" />
          <el-option label="已发布" :value="2" />
          <el-option label="已下架" :value="3" />
          <el-option label="审核拒绝" :value="4" />
        </el-select>
        <el-button type="primary" class="red-btn" @click="handleSearch">搜索</el-button>
      </div>
    </el-card>

    <!-- 资源表格 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="resources" v-loading="loading" stripe>
        <el-table-column label="资源标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ { 1:'文章', 2:'视频', 3:'文档', 4:'音频' }[row.resourceType] || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" prop="categoryName" width="120" />
        <el-table-column label="发布者" prop="creatorName" width="110" />
        <el-table-column label="浏览量" prop="viewCount" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="(['info','warning','success','info','danger'] as const)[row.status] ?? 'info'"
              size="small"
            >{{ ['草稿','待审核','已发布','已下架','审核拒绝'][row.status] || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdTime" width="120">
          <template #default="{ row }">{{ row.createdTime?.slice(0,10) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="$router.push(`/resource/${row.id}`)">查看</el-button>
            <template v-if="row.status === 1">
              <el-button text size="small" type="success" @click="handleAudit(row.id, 2)">通过</el-button>
              <el-button text size="small" type="danger" @click="handleAuditReject(row.id)">拒绝</el-button>
            </template>
            <el-button v-if="row.status === 2" text size="small" type="warning" @click="handleOffline(row.id)">下架</el-button>
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
        @change="fetchResources"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getResourceList, auditResource, offlineResource } from '@/api/resource'
import type { ResourceItem } from '@/api/resource'

const router = useRouter()

// 默认查看待审核+已发布的资源（管理后台视角）
const query = reactive<{
  keyword?: string; status?: number;
  pageNum: number; pageSize: number;
}>({ status: 1, pageNum: 1, pageSize: 15 })

const loading = ref(false)
const resources = ref<ResourceItem[]>([])
const total = ref(0)

async function fetchResources() {
  loading.value = true
  try {
    const res = await getResourceList(query)
    resources.value = res?.records || []
    total.value = res?.total ?? 0
  } finally { loading.value = false }
}

function handleSearch() { query.pageNum = 1; fetchResources() }

// 通过审核（auditStatus=2）
async function handleAudit(id: string, status: number) {
  await auditResource(id, { auditStatus: status })
  ElMessage.success('审核通过')
  fetchResources()
}

// 拒绝审核（auditStatus=4，需填写理由）
async function handleAuditReject(id: string) {
  const { value: comment } = await ElMessageBox.prompt('请输入拒绝理由', '审核拒绝', {
    confirmButtonText: '确认拒绝',
    cancelButtonText: '取消',
  })
  await auditResource(id, { auditStatus: 4, auditComment: comment })
  ElMessage.success('已拒绝')
  fetchResources()
}

// 下架
async function handleOffline(id: string) {
  await ElMessageBox.confirm('确定下架该资源？', '提示', { type: 'warning' })
  await offlineResource(id)
  ElMessage.success('已下架')
  fetchResources()
}

onMounted(fetchResources)
</script>

<style scoped>
.resources-mgmt-page { display: flex; flex-direction: column; gap: 16px; }
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
