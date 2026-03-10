<template>
  <div class="resource-detail-page" v-loading="loading">
    <!-- 返回 -->
    <el-button text :icon="ArrowLeft" class="back-btn" @click="$router.push('/resource')">返回资源库</el-button>

    <div v-if="resource" class="detail-layout">
      <!-- ===== 左侧主内容 ===== -->
      <div class="main-content">

        <!-- 资源头部info -->
        <div class="resource-hero">
          <div class="hero-left">
            <!-- 封面 / 媒体预览器 -->
            <div class="media-box" :class="`bg-type-${resource.resourceType}`">
              <!-- 视频播放 -->
              <video
                v-if="previewType === 'video' && previewUrl"
                :key="previewUrl"
                :src="previewUrl"
                controls
                class="video-player"
                @play="trackView"
              />
              <!-- 文档预览 (PDF/Office) -->
              <iframe
                v-else-if="previewType === 'doc' && previewUrl"
                :key="previewUrl"
                :src="previewUrl"
                class="doc-viewer"
                frameborder="0"
              ></iframe>
              <!-- 图片封面 (文章或无预览文件时) -->
              <img
                v-else-if="resource.coverUrl"
                :src="resource.coverUrl"
                :alt="resource.title"
                class="cover-img"
              />
              <!-- 默认图标 -->
              <div v-else class="media-fallback">
                <el-icon :size="64" color="rgba(255,255,255,0.8)"><component :is="typeIcon(resource.resourceType)" /></el-icon>
              </div>
            </div>
          </div>

          <!-- 资源基本信息 -->
          <div class="hero-right">
            <div class="type-badge-row">
              <span class="type-badge" :class="`type-${resource.resourceType}`">{{ typeLabel(resource.resourceType) }}</span>
              <el-tag v-if="resource.categoryName" size="small" type="info">{{ resource.categoryName }}</el-tag>
            </div>
            <h1 class="resource-title">{{ resource.title }}</h1>
            <p v-if="resource.summary" class="resource-summary">{{ resource.summary }}</p>

            <!-- 元数据 -->
            <div class="meta-grid">
              <div class="meta-item">
                <el-icon><User /></el-icon>
                <span class="meta-label">发布者</span>
                <span>{{ resource.creatorName }}</span>
              </div>
              <div class="meta-item">
                <el-icon><View /></el-icon>
                <span class="meta-label">浏览量</span>
                <span>{{ resource.viewCount }}</span>
              </div>
              <div class="meta-item">
                <el-icon><Clock /></el-icon>
                <span class="meta-label">发布时间</span>
                <span>{{ resource.createdTime?.slice(0, 10) }}</span>
              </div>
            </div>

            <!-- 标签 -->
            <div v-if="resource.tags?.length" class="tag-row">
              <el-tag
                v-for="tag in resource.tags"
                :key="tag.id"
                type="danger"
                size="small"
                class="res-tag"
                effect="plain"
              >{{ tag.tagName }}</el-tag>
            </div>

            <!-- 操作按钮 -->
            <div class="action-row">
              <!-- 文档/PDF 下载按钮 -->
              <el-button
                v-if="currentFile && resource.resourceType !== 2"
                type="primary"
                class="red-btn"
                :icon="Download"
                @click="handleDownload"
              >
                {{ resource.resourceType === 3 ? '下载文档' : resource.resourceType === 4 ? '下载音频' : '下载文件' }}
              </el-button>

              <!-- 教师/管理员：编辑/审核 -->
              <template v-if="canEdit">
                <el-button :icon="Edit" @click="showEditDialog = true">编辑</el-button>
                <el-button
                  v-if="resource.status === 0"
                  type="warning"
                  @click="handleSubmitAudit"
                >提交审核</el-button>
                <el-button
                  v-if="resource.status === 2"
                  type="danger"
                  plain
                  @click="handleOffline"
                >下架</el-button>
              </template>

              <!-- 管理员审核入口 -->
              <el-button
                v-if="authStore.isAdmin && resource.status === 1"
                type="success"
                @click="handleAdminAudit(2)"
              >审核通过</el-button>
              <el-button
                v-if="authStore.isAdmin && resource.status === 1"
                type="danger"
                plain
                @click="handleAdminAudit(4)"
              >审核拒绝</el-button>
            </div>

            <!-- 管理员：审核拒绝原因 -->
            <el-alert
              v-if="resource.status === 4"
              type="error"
              show-icon
              :closable="false"
              title="审核不通过"
              description="该资源在审核中被拒绝，请修改后重新提交。"
              style="margin-top: 12px"
            />
          </div>
        </div>

        <!-- 正文/内容 -->
        <el-card class="content-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>资源详情</h3>
              <el-button
                v-if="previewType === 'audio' && previewUrl"
                type="primary" plain size="small" :icon="Headset"
                @click="audioPlaying = !audioPlaying"
              >
                {{ audioPlaying ? '暂停' : '播放' }}音频
              </el-button>
            </div>
          </template>

          <!-- 音频播放器 -->
          <div v-if="previewType === 'audio' && previewUrl" class="audio-wrap">
            <audio ref="audioRef" :key="previewUrl" :src="previewUrl" controls class="audio-player" @play="trackView" />
          </div>

          <!-- 富文本内容 -->
          <div
            v-if="resource.content"
            class="resource-content"
            v-html="formattedContent"
          />

          <!-- 附件列表 -->
          <div v-if="resource.attachments?.length" class="attachments-section">
            <div class="section-title">资源附件 ({{ resource.attachments.length }})</div>
            <div class="attachment-list">
              <div
                v-for="(file, index) in resource.attachments"
                :key="file.id"
                class="attachment-item"
                :class="{ active: selectedAttachIdx === index }"
              >
                <el-icon><Document /></el-icon>
                <span class="file-name" :title="file.fileName">{{ file.fileName }}</span>
                <div class="attach-actions">
                  <el-button type="primary" link @click="selectedAttachIdx = index">在线预览</el-button>
                  <el-button type="info" link @click="handleFileDownload(file.fileUrl, file.fileName)">下载</el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 无内容 -->
          <el-empty v-if="!resource.content && resource.resourceType === 1" description="该资源暂无正文内容" :image-size="80" />
        </el-card>

        <!-- 审核记录（教师/管理员可见） -->
        <el-card v-if="canEdit && auditLogs.length" class="audit-logs-card" shadow="never">
          <template #header><h3>审核记录</h3></template>
          <el-timeline>
            <el-timeline-item
              v-for="log in auditLogs"
              :key="log.id"
              :type="log.auditResult === 1 ? 'success' : log.auditResult === 2 ? 'danger' : 'warning'"
              :timestamp="log.auditTime?.slice(0, 16)"
              placement="top"
            >
              <div class="log-item">
                <span class="log-auditor">{{ log.auditorName }}</span>：
                <el-tag :type="log.auditResult === 1 ? 'success' : 'danger'" size="small">
                  {{ log.auditResult === 1 ? '通过' : '拒绝' }}
                </el-tag>
                <span v-if="log.auditRemark" class="log-comment">{{ log.auditRemark }}</span>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </div>

      <!-- ===== 右侧推荐 ===== -->
      <aside class="resource-sidebar">
        <div class="sidebar-title">相关资源</div>
        <div v-loading="relatedLoading" class="related-list">
          <div
            v-for="r in relatedResources"
            :key="r.id"
            class="related-item"
            @click="$router.push(`/resource/${r.id}`)"
          >
            <div class="related-cover" :class="`bg-type-${r.resourceType}`">
              <img v-if="r.coverUrl" :src="r.coverUrl" :alt="r.title" />
              <el-icon v-else :size="20" color="rgba(255,255,255,0.8)"><component :is="typeIcon(r.resourceType)" /></el-icon>
            </div>
            <div class="related-info">
              <div class="related-title">{{ r.title }}</div>
              <div class="related-meta">
                {{ typeLabel(r.resourceType) }} · {{ r.viewCount }} 次浏览
              </div>
            </div>
          </div>
          <el-empty v-if="!relatedLoading && !relatedResources.length" description="暂无相关资源" :image-size="60" />
        </div>
      </aside>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑资源" width="560px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="90px" size="large">
        <el-form-item label="资源标题">
          <el-input v-model="editForm.title" clearable />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.summary" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="正文内容">
          <el-input v-model="editForm.content" type="textarea" :rows="6" placeholder="支持换行，保存后可查看" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="editLoading" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, markRaw, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, View, User, Clock, Download, Edit, Headset,
  VideoPlay, Document,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getResourceDetail, getResourceList, updateResource,
  submitResourceForAudit, auditResource, offlineResource, getResourceAuditLogs,
} from '@/api/resource'
import { logBehavior } from '@/api/report'
import type { ResourceItem, AuditLog } from '@/api/resource'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const resourceId = computed(() => route.params.id as string)

// ─── 资源详情 ───
const loading = ref(false)
const resource = ref<ResourceItem | null>(null)
const auditLogs = ref<AuditLog[]>([])

const canEdit = computed(() =>
  authStore.isAdmin || resource.value?.creatorId === authStore.userInfo?.userId,
)

function typeIcon(t: number) { return { 1: markRaw(Document), 2: markRaw(VideoPlay), 3: markRaw(Document), 4: markRaw(Headset) }[t] ?? markRaw(Document) }
function typeLabel(t: number): string { return { 1: '文章', 2: '视频', 3: '文档', 4: '音频' }[t] ?? '资源' }

const selectedAttachIdx = ref(-1) // 初始为 -1，不自动触发预览以防自动下载

const currentFile = computed(() => {
  if (resource.value?.attachments?.length) {
    return resource.value.attachments[selectedAttachIdx.value] || resource.value.attachments[0]
  }
  return null
})

const previewUrl = computed(() => {
  const url = currentFile.value?.fileUrl
  if (!url) return ''

  // 移除查询参数进行后缀判断
  const pureUrl = url.split('?')[0].toLowerCase()
  const isOffice = pureUrl.endsWith('.ppt') || pureUrl.endsWith('.pptx') || 
                   pureUrl.endsWith('.doc') || pureUrl.endsWith('.docx') || 
                   pureUrl.endsWith('.xls') || pureUrl.endsWith('.xlsx')
  
  if (isOffice && url.startsWith('http')) {
    // 确保 URL 是全路径且编码
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
  }
  return url
})

const previewType = computed(() => {
  const file = currentFile.value
  if (!file || selectedAttachIdx.value === -1) return 'none'
  
  const url = file.fileUrl.toLowerCase()
  const pureUrl = url.split('?')[0]

  if (pureUrl.endsWith('.mp4') || pureUrl.endsWith('.webm') || pureUrl.endsWith('.ogg')) return 'video'
  if (pureUrl.endsWith('.mp3') || pureUrl.endsWith('.wav')) return 'audio'
  if (pureUrl.endsWith('.pdf')) return 'doc'
  if (previewUrl.value.includes('officeapps.live.com')) return 'doc'

  return 'none'
})

// 简单格式化：换行转 <br>，支持纯文本
const formattedContent = computed(() => {
  const c = resource.value?.content ?? ''
  // 如果已经是 HTML（含标签），直接返回；否则转义换行
  if (c.includes('<') && c.includes('>')) return c
  return c.replace(/\n/g, '<br/>')
})

async function fetchDetail() {
  loading.value = true
  try {
    resource.value = await getResourceDetail(resourceId.value)
    // 异步加载审核记录（失败不阻断页面）
    if (canEdit.value) {
      getResourceAuditLogs(resourceId.value).then((r) => { auditLogs.value = r }).catch(() => {})
    }
  } finally { loading.value = false }
}

// ─── 浏览行为记录（埋点 RESOURCE_VIEW） ───
let tracked = false
function trackView() {
  if (tracked || !authStore.userInfo?.userId) return
  tracked = true
  if (!authStore.isTeacher && !authStore.isAdmin) {
    logBehavior({
      userId: authStore.userInfo.userId,
      courseId: '0',          // 资源库无课程上下文，传 0
      behaviorType: 'RESOURCE_VIEW',
      targetId: resourceId.value,
    }).catch(() => { /* 静默失败，不影响主流程 */ })
  }
}

// ─── 下载 ───
function handleDownload() {
  if (!currentFile.value?.fileUrl) return
  handleFileDownload(currentFile.value.fileUrl, currentFile.value.fileName || '文件')
}

function handleFileDownload(url: string, name: string) {
  // 记录下载行为
  if (authStore.userInfo?.userId && !authStore.isTeacher && !authStore.isAdmin) {
    logBehavior({
      userId: authStore.userInfo.userId,
      courseId: '0',
      behaviorType: 'RESOURCE_DOWNLOAD',
      targetId: resourceId.value,
    }).catch(() => {})
  }

  // 构建下载
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ─── 提交审核 ───
async function handleSubmitAudit() {
  await ElMessageBox.confirm('确定将该资源提交审核吗？', '提示', { type: 'info' })
  await submitResourceForAudit(resourceId.value)
  ElMessage.success('已提交审核，请耐心等待')
  resource.value!.status = 1
}

// ─── 下架 ───
async function handleOffline() {
  await ElMessageBox.confirm('确定要下架该资源吗？', '下架确认', { type: 'warning' })
  await offlineResource(resourceId.value)
  ElMessage.success('资源已下架')
  resource.value!.status = 3
}

// ─── 管理员审核 ───
async function handleAdminAudit(status: number) {
  const approved = status === 1
  let remark: string | undefined
  if (!approved) {
    const { value } = await ElMessageBox.prompt('请输入拒绝理由', '审核拒绝', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPlaceholder: '请说明拒绝原因',
    })
    remark = value
  }
  await auditResource(resourceId.value, { auditResult: status, auditRemark: remark })
  ElMessage.success(approved ? '已通过审核' : '已拒绝')
  resource.value!.status = approved ? 2 : 4  // 2=已发布 4=审核拒绝
}

// ─── 编辑 ───
const showEditDialog = ref(false)
const editLoading = ref(false)
const editForm = reactive({ title: '', summary: '', content: '' })

function openEdit() {
  editForm.title = resource.value?.title ?? ''
  editForm.summary = resource.value?.summary ?? ''
  editForm.content = resource.value?.content ?? ''
  showEditDialog.value = true
}

async function handleSaveEdit() {
  editLoading.value = true
  try {
    await updateResource(resourceId.value, {
      title: editForm.title,
      summary: editForm.summary,
      content: editForm.content,
    })
    ElMessage.success('保存成功')
    showEditDialog.value = false
    await fetchDetail()
  } finally { editLoading.value = false }
}

// ─── 相关资源（同类型/分类） ───
const relatedLoading = ref(false)
const relatedResources = ref<ResourceItem[]>([])

async function fetchRelated() {
  if (!resource.value) return
  relatedLoading.value = true
  try {
    const res = await getResourceList({
      resourceType: resource.value.resourceType,
      categoryId: resource.value.categoryId,
      status: 2,
      pageSize: 6,
    } as ReturnType<typeof Object.assign>)
    relatedResources.value = (res?.records || []).filter((r) => r.id !== resourceId.value)
  } catch { /* 静默 */ }
  finally { relatedLoading.value = false }
}

// ─── 音频状态 ───
const audioPlaying = ref(false)

onMounted(async () => {
  await fetchDetail()
  // 仅视频/音频类资源默认开启预览，文档类保持 -1 等待手动点击，防止自动下载
  if (resource.value?.attachments?.length) {
    if (resource.value.resourceType === 2 || resource.value.resourceType === 4) {
      selectedAttachIdx.value = 0
    }
  }
  fetchRelated()
  trackView()
})
</script>

<style scoped>
.resource-detail-page { display: flex; flex-direction: column; gap: 16px; }

.back-btn { margin-bottom: 4px; color: #78909c; }

/* ===== 详情布局 ===== */
.detail-layout { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: start; }

/* ===== 主内容 ===== */
.main-content { display: flex; flex-direction: column; gap: 16px; }

/* ===== 资源头部 ===== */
.resource-hero {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  gap: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.hero-left { flex-shrink: 0; width: 340px; }

.media-box {
  width: 340px; height: 200px;
  border-radius: 12px; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.bg-type-1 { background: linear-gradient(135deg, #b71c1c, #ff5252); }
.bg-type-2 { background: linear-gradient(135deg, #1565c0, #42a5f5); }
.bg-type-3 { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
.bg-type-4 { background: linear-gradient(135deg, #e65100, #ffa726); }

.video-player { width: 100%; height: 100%; object-fit: contain; background: #000; }
.doc-viewer { width: 100%; height: 100%; background: #f5f5f5; border: none; }
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.media-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.hero-right { flex: 1; min-width: 0; }

.type-badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }

.type-badge {
  font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 12px;
}
.type-1 { background: #ffebee; color: #d32f2f; }
.type-2 { background: #e3f2fd; color: #1976d2; }
.type-3 { background: #e8f5e9; color: #388e3c; }
.type-4 { background: #fff3e0; color: #f57c00; }

.resource-title {
  margin: 0 0 10px;
  font-size: 22px; font-weight: 800; color: #1a1a1a; line-height: 1.4;
}

.resource-summary {
  margin: 0 0 14px;
  font-size: 14px; color: #546e7a; line-height: 1.7;
}

.meta-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }

.meta-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #546e7a;
}
.meta-item .el-icon { color: #d32f2f; }
.meta-label { color: #90a4ae; min-width: 60px; }

.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.res-tag { margin: 0; }

.action-row { display: flex; gap: 10px; flex-wrap: wrap; }

.red-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important;
}

/* ===== 内容卡片 ===== */
.content-card { border-radius: 14px !important; }

:deep(.content-card .el-card__header) { padding: 14px 20px; }

.card-header { display: flex; align-items: center; justify-content: space-between; }
.card-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #263238; }

.audio-wrap { margin-bottom: 24px; }
.audio-player { width: 100%; border-radius: 8px; background: #f5f5f5; }

/* 附件区域 */
.attachments-section {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px dashed #eee;
}
.section-title {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f9f9f9;
  border-radius: 8px;
  transition: all 0.3s;
}
.attachment-item.active {
  background: #fff1f0;
  border-color: #ffccc7;
}
.attachment-item:hover {
  background: #f0f0f0;
}
.attachment-item .file-name {
  flex: 1;
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.attachment-item.active .file-name {
  color: #d32f2f;
  font-weight: 600;
}
.attach-actions {
  display: flex;
  gap: 8px;
}
.attachment-item .el-icon {
  color: #c0c4cc;
}

.resource-content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  min-height: 200px;
}
/* 移除多余的 `white-space: pre-wrap;` */

/* ===== 审核记录 ===== */
.audit-logs-card { border-radius: 14px !important; }
.log-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.log-auditor { font-weight: 600; color: #455a64; }
.log-comment { color: #78909c; margin-left: 6px; }

/* ===== 右侧推荐 ===== */
.resource-sidebar {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  position: sticky; top: 72px;
}

.sidebar-title {
  font-size: 14px; font-weight: 700; color: #263238;
  margin-bottom: 14px; padding-bottom: 10px;
  border-bottom: 2px solid #ffebee;
  color: #d32f2f;
}

.related-list { display: flex; flex-direction: column; gap: 10px; }

.related-item {
  display: flex; gap: 10px; align-items: center;
  cursor: pointer; padding: 6px; border-radius: 10px; transition: all 0.2s;
}
.related-item:hover { background: #fff8f8; }

.related-cover {
  width: 72px; height: 48px; flex-shrink: 0; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.related-cover img { width: 100%; height: 100%; object-fit: cover; }

.related-title { font-size: 13px; font-weight: 600; color: #263238; line-height: 1.4; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.related-meta  { font-size: 11px; color: #90a4ae; }

/* ===== 确认按钮 ===== */
:deep(.red-confirm-btn) {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
}

@media (max-width: 1000px) {
  .detail-layout { grid-template-columns: 1fr; }
  .resource-sidebar { position: relative; top: 0; }
  .resource-hero { flex-direction: column; }
  .hero-left { width: 100% !important; }
  .media-box { width: 100% !important; }
}
</style>
