<template>
  <div class="resources-mgmt-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">资源管理</h2>
        <p class="page-desc">全站资源库内容预览、查看详情与违规下架管理</p>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-input v-model="query.keyword" placeholder="资源标题关键词" clearable :prefix-icon="Search" style="width:220px" @keyup.enter="handleSearch" @clear="handleSearch" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width:130px" @change="handleSearch">
          <el-option label="待审核" :value="1" />
          <el-option label="已发布" :value="2" />
          <el-option label="审核拒绝" :value="3" />
          <el-option label="已下架" :value="4" />
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
              :type="(['info','warning','success','danger','info'] as const)[row.status] ?? 'info'"
              size="small"
            >{{ ['草稿','待审核','已发布','审核拒绝','已下架'][row.status] || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdTime" width="120">
          <template #default="{ row }">{{ row.createdTime?.slice(0,10) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="$router.push(`/resource/${row.id}`)">查看详情</el-button>
            <el-button
              v-if="row.status === 2"
              text
              size="small"
              type="warning"
              @click="handleOffline(row)"
            >下架</el-button>
            <el-button
              v-if="row.status === 3 || row.status === 4"
              text
              size="small"
              type="primary"
              @click="handleOnline(row)"
            >上架</el-button>
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
import { getResourceList, offlineResource, onlineResource } from '@/api/resource'
import type { ResourceItem } from '@/api/resource'

const router = useRouter()

// 默认查询全量资源（管理后台视角）
const query = reactive({
  keyword: undefined as string | undefined,
  status: undefined as number | undefined,
  pageNum: 1,
  pageSize: 15
})

const loading = ref(false)
const resources = ref<ResourceItem[]>([])
const total = ref(0)

async function fetchResources() {
  loading.value = true
  try {
    const res = await getResourceList(query)
    resources.value = res?.list || res?.records || []
    total.value = res?.total ?? 0
  } finally { loading.value = false }
}

function handleSearch() { query.pageNum = 1; fetchResources() }

// 下架确认与执行
async function handleOffline(row: ResourceItem) {
  try {
    await ElMessageBox.confirm(
      `确定下架资源《${row.title}》吗？下架后前台用户将无法访问。`,
      '提示',
      { confirmButtonText: '确定下架', cancelButtonText: '取消', type: 'warning' }
    )
    await offlineResource(row.id)
    ElMessage.success('已下架')
    fetchResources()
  } catch (err) {
    //
  }
}

// 上架确认与执行
async function handleOnline(row: ResourceItem) {
  try {
    const actionText = row.status === 3 ? '重新申请上架' : '上架'
    await ElMessageBox.confirm(
      `确定${actionText}资源《${row.title}》吗？上架后前台用户将可以正常访问。`,
      '提示',
      { confirmButtonText: '确定上架', cancelButtonText: '取消', type: 'primary' }
    )
    await onlineResource(row.id)
    ElMessage.success('已上架')
    fetchResources()
  } catch (err) {
    //
  }
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
