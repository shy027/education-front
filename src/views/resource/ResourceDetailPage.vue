<template>
  <div class="resource-detail-page" v-loading="loading">
    <!-- 返回 -->
    <el-button text :icon="ArrowLeft" class="back-btn" @click="$router.push('/resource')">返回资源库</el-button>

    <div v-if="resource" class="detail-layout">
      <!-- ===== 左侧主内容 ===== -->
      <div class="main-content">

        <!-- 资源头部 (顶部显示封面与基本信息) -->
        <div class="resource-hero">
          <div class="hero-left">
            <div class="media-box" :class="`bg-type-${resource.resourceType}`">
              <img
                v-if="resource.coverUrl"
                :src="resource.coverUrl"
                :alt="resource.title"
                class="cover-img"
              />
              <div v-else class="media-fallback">
                <el-icon :size="64" color="rgba(255,255,255,0.8)"><component :is="typeIcon(resource.resourceType)" /></el-icon>
              </div>
            </div>
          </div>

          <div class="hero-right">
            <div class="type-badge-row">
              <span class="type-badge" :class="`type-${resource.resourceType}`">{{ typeLabel(resource.resourceType) }}</span>
              <el-tag v-if="resource.categoryName" size="small" type="info">{{ resource.categoryName }}</el-tag>
            </div>
            <h1 class="resource-title">{{ resource.title }}</h1>
            <p v-if="resource.summary" class="resource-summary">{{ resource.summary }}</p>

            <div class="meta-grid">
              <div class="meta-item"><el-icon><User /></el-icon><span class="meta-label">发布者</span><span>{{ resource.creatorName }}</span></div>
              <div class="meta-item"><el-icon><View /></el-icon><span class="meta-label">浏览量</span><span>{{ resource.viewCount }}</span></div>
              <div class="meta-item"><el-icon><Clock /></el-icon><span class="meta-label">发布日期</span><span>{{ resource.createdTime?.slice(0, 10) }}</span></div>
            </div>

            <div v-if="resource.tags?.length" class="tag-row">
              <el-tag v-for="tag in resource.tags" :key="tag.id" type="danger" size="small" class="res-tag" effect="plain">{{ tag.tagName }}</el-tag>
            </div>

            <div class="action-row">
              <template v-if="canEdit">
                <el-button :icon="Edit" @click="router.push({ name: 'ResourceEdit', params: { id: resourceId } })">编辑</el-button>
                <el-button v-if="resource.status === 0 || resource.status === 3" type="warning" @click="handleSubmitAudit">提交审核</el-button>
                <el-button v-if="resource.status === 2" type="danger" plain @click="handleOffline">下架</el-button>
              </template>
              <template v-if="authStore.isAdmin && resource.status === 1">
                <el-button type="success" @click="handleAdminAudit(1)">审核通过</el-button>
                <el-button type="danger" plain @click="handleAdminAudit(2)">审核拒绝</el-button>
              </template>
            </div>
          </div>
        </div>

        <!-- 在线预览区 / 挂图展示区 -->
        <el-card v-if="previewUrl || resource.resourceType === 5" class="preview-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h3>内容展示：{{ resource.title }}</h3>
            </div>
          </template>
          <div class="media-previewer" :class="{ 'gallery-mode': resource.resourceType === 5 }">
            <!-- 挂图模式：多图画廊 -->
            <div v-if="resource.resourceType === 5" class="image-gallery">
              <el-image
                v-for="(img, idx) in resource.attachments"
                :key="img.id"
                :src="img.fileUrl"
                :preview-src-list="resource.attachments.map(a => a.fileUrl)"
                :initial-index="idx"
                fit="cover"
                class="gallery-item"
              />
            </div>

            <!-- 常规媒体预览 -->
            <template v-else>
              <!-- 视频播放 -->
              <video
                v-if="previewType === 'video'"
                :key="previewUrl"
                :src="previewUrl"
                controls
                autoplay
                class="video-player"
                @play="trackView"
              />
              <!-- PDF 预览 -->
              <div v-else-if="previewType === 'pdf'" ref="pdfContainer" class="pdf-viewer-container">
                <vue-pdf-embed 
                  v-if="pdfSource" 
                  :source="pdfSource" 
                  :width="containerWidth > 0 ? containerWidth : undefined"
                  class="pdf-render" 
                />
                <div v-else v-loading="loadingPdf" class="pdf-loading">正在加载文档流...</div>
              </div>
              <!-- Office 预览 -->
              <iframe
                v-else-if="previewType === 'office'"
                :src="previewUrl"
                class="doc-viewer"
                frameborder="0"
                allowfullscreen
              ></iframe>
              <!-- 音频播放 -->
              <div v-else-if="previewType === 'audio'" class="audio-preview-wrap">
                <el-icon :size="80" class="audio-icon"><Headset /></el-icon>
                <audio ref="audioRef" :key="previewUrl" :src="previewUrl" controls class="audio-player" @play="trackView" />
                <div class="playing-hint">正在播放音频：{{ currentFile?.fileName || resource.title }}</div>
              </div>
              <!-- 其它 -->
              <div v-else class="stage-fallback">
                <el-icon :size="100" color="rgba(0,0,0,0.1)"><component :is="typeIcon(resource.resourceType)" /></el-icon>
              </div>
            </template>
          </div>
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

    </div>

    <!-- 编辑对话框已移除，跳转至独立编辑页 -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, markRaw, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useElementSize } from '@vueuse/core'
import axios from '@/utils/request'
import VuePdfEmbed from 'vue-pdf-embed'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, View, User, Clock, Download, Edit, Headset,
  VideoPlay, Document, Reading,
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

const pdfContainer = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(pdfContainer)

// ─── 资源详情 ───
const loading = ref(false)
const resource = ref<ResourceItem | null>(null)
const auditLogs = ref<AuditLog[]>([])

const canEdit = computed(() => {
  if (!resource.value) return false
  const isAdmin = authStore.isAdmin
  const isCreator = resource.value.creatorId == authStore.userInfo?.userId
  // 已经发布审核成功的内容不可再编辑（管理员除外）
  if (resource.value.status === 2) return isAdmin
  return isAdmin || isCreator
})

function typeIcon(t: number) { return { 1: markRaw(VideoPlay), 2: markRaw(VideoPlay), 3: markRaw(Document), 4: markRaw(Headset), 5: markRaw(Reading) }[t] ?? markRaw(Document) }
function typeLabel(t: number): string { return { 1: '动画', 2: '视频', 3: '文档', 4: '音频', 5: '挂图' }[t] ?? '资源' }

const selectedAttachIdx = ref(0) // 默认开启首个附件预览

const currentFile = computed(() => {
  // 注意：index=-1 时一定返回 null，避免 attachments[-1] 为 undefined 时 || 兜底到 attachments[0]
  if (selectedAttachIdx.value < 0 || !resource.value?.attachments?.length) return null
  return resource.value.attachments[selectedAttachIdx.value] ?? null
})



const pdfSource = ref('')
const loadingPdf = ref(false)

// 为了带上 JWT Token，通过 axios 请求后端代理接口获取 PDF 二进制流
watch(() => currentFile.value, async (file) => {
  // 清理上一份预览产生的 Blob
  if (pdfSource.value && pdfSource.value.startsWith('blob:')) {
    URL.revokeObjectURL(pdfSource.value)
    pdfSource.value = ''
  }
  if (!file) return

  const isPdf = file.fileName?.toLowerCase().endsWith('.pdf') || 
                file.fileUrl.split('?')[0].toLowerCase().endsWith('.pdf')
  
  if (isPdf) {
    loadingPdf.value = true
    try {
      // 通过已经带了 Authorization 拦截器的 axios 请求后端代理
      // 注意：这里的 axios 已由 import axios from '@/utils/request' 注入
      const proxyUrl = `/v1/upload/pdf-proxy?fileUrl=${encodeURIComponent(file.fileUrl)}`
      const res = await axios.get(proxyUrl, { 
        responseType: 'blob',
      })
      // 检查 res 是否为 Blob, 因为拦截器可能已经解包了 res.data 为 res
      // 在我们的 request.ts 中，成功时返回了 res.data as never
      // 但对于 responseType: 'blob'，解包后的内容就是 blob 对象本身
      const blob = new Blob([res as any], { type: 'application/pdf' })
      pdfSource.value = URL.createObjectURL(blob)
    } catch (e) {
      console.error('PDF 文档流下载失败', e)
      ElMessage.error('无法加载该文档预览，请检查网络或登录状态')
    } finally {
      loadingPdf.value = false
    }
  }
}, { immediate: true })

const previewUrl = computed(() => {
  const url = currentFile.value?.fileUrl
  if (!url) return ''

  const fileName = currentFile.value?.fileName?.toLowerCase() || ''
  const pureUrl = url.split('?')[0].toLowerCase()
  
  // Office 预览逻辑保持不变（微软服务无法带我们的 Token，故仅适用于公开或临时签名的 URL）
  const isOffice = pureUrl.endsWith('.ppt') || pureUrl.endsWith('.pptx') || 
                   pureUrl.endsWith('.doc') || pureUrl.endsWith('.docx') || 
                   pureUrl.endsWith('.xls') || pureUrl.endsWith('.xlsx')
  
  if (isOffice && url.startsWith('http')) {
    // 使用 embed.aspx 提高嵌入稳定性，移除其他预览源以规避 CORS 问题
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}&wdAr=0`
  }
  
  return url
})

const previewType = computed(() => {
  const file = currentFile.value
  if (!file) return 'none'
  
  const fileName = file.fileName?.toLowerCase() || ''
  const pureUrl = file.fileUrl.split('?')[0].toLowerCase()

  if (file.fileType === 'video' || pureUrl.endsWith('.mp4') || pureUrl.endsWith('.webm') || resource.value?.resourceType === 1) return 'video'
  if (file.fileType === 'audio' || pureUrl.endsWith('.mp3') || pureUrl.endsWith('.wav')) return 'audio'
  if (file.fileType === 'pdf' || fileName.endsWith('.pdf') || pureUrl.endsWith('.pdf')) return 'pdf'
  if (file.fileType === 'image' || pureUrl.endsWith('.jpg') || pureUrl.endsWith('.png') || pureUrl.endsWith('.webp')) return 'image'
  if (previewUrl.value.includes('officeapps.live.com')) return 'office'

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
      behaviorObjectId: resourceId.value,
    }).catch(() => { /* 静默失败，不影响主流程 */ })
  }
}

// ─── 下载逻辑已移除 ───

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
  // 刷新详情
  fetchDetail()
}

// ─── 编辑功能已迁移至 ResourceCreatePage (编辑模式) ───

onMounted(async () => {
  await fetchDetail()
  trackView()
})
</script>

<style scoped>
.resource-detail-page { display: flex; flex-direction: column; gap: 16px; }

.back-btn { margin-bottom: 4px; color: #78909c; }

/* ===== 详情布局 ===== */
.detail-layout { display: flex; flex-direction: column; gap: 20px; }

/* ===== 主内容 ===== */
.main-content { display: flex; flex-direction: column; gap: 16px; }

/* ===== 资源头部 (还原经典布局) ===== */
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
.bg-type-1 { background: linear-gradient(135deg, #7b1fa2, #ba68c8); }
.bg-type-2 { background: linear-gradient(135deg, #1565c0, #42a5f5); }
.bg-type-3 { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
.bg-type-4 { background: linear-gradient(135deg, #e65100, #ffa726); }
.bg-type-5 { background: linear-gradient(135deg, #00838f, #00bcd4); }

.cover-img { width: 100%; height: 100%; object-fit: cover; }
.media-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.hero-right { flex: 1; min-width: 0; }

.type-badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.type-badge { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 12px; }
.type-1 { background: #f3e5f5; color: #7b1fa2; }
.type-2 { background: #e3f2fd; color: #1976d2; }
.type-3 { background: #e8f5e9; color: #388e3c; }
.type-4 { background: #fff3e0; color: #f57c00; }
.type-5 { background: #e0f7fa; color: #00838f; }

.resource-title { margin: 0 0 10px; font-size: 22px; font-weight: 800; color: #1a1a1a; line-height: 1.4; }
.resource-summary { margin: 0 0 14px; font-size: 14px; color: #546e7a; line-height: 1.7; }

.meta-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.meta-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #546e7a; }
.meta-item .el-icon { color: #d32f2f; }
.meta-label { color: #90a4ae; min-width: 60px; }

.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.action-row { display: flex; gap: 10px; flex-wrap: wrap; }

/* ===== 底部预览区 (新) ===== */
.preview-card { border-radius: 14px !important; margin-bottom: 16px; overflow: hidden; }
:deep(.preview-card .el-card__body) { padding: 0; }

.media-previewer.gallery-mode { height: auto; min-height: 400px; background: #fafafa; padding: 20px; }
.image-gallery { display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; }
.gallery-item {
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  cursor: zoom-in;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transition: transform 0.2s;
}
.gallery-item:hover { transform: translateY(-2px); }

.video-player { width: 100%; height: 100%; max-height: 600px; background: #000; }
.doc-viewer { width: 100%; height: 100%; border: none; background: #fff; }

.audio-preview-wrap {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;
  padding: 40px; height: 100%;
}
.audio-icon { color: #90a4ae; opacity: 0.3; }
.audio-player { width: 100%; max-width: 500px; }
.playing-hint { font-size: 14px; color: #90a4ae; }

.stage-fallback { display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5; }

/* 附件卡片 */
.attachments-card { border-radius: 14px !important; margin-top: 4px; }
:deep(.attachments-card .el-card__header) { padding: 14px 20px; }
:deep(.attachments-card .el-card__body) { padding: 20px; }

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
  word-break: break-word;
}
.resource-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 10px 0;
  display: block;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.resource-content :deep(p) {
  margin: 1em 0;
}
.resource-content :deep(h1), 
.resource-content :deep(h2), 
.resource-content :deep(h3), 
.resource-content :deep(h4), 
.resource-content :deep(h5) {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  color: #263238;
}
.resource-content :deep(ul), 
.resource-content :deep(ol) {
  padding-left: 1.5em;
  margin: 1em 0;
}
.resource-content :deep(blockquote) {
  border-left: 4px solid #d32f2f;
  background: #fdf2f2;
  padding: 12px 20px;
  margin: 1.5em 0;
  color: #546e7a;
  font-style: italic;
}

/* ===== 审核记录 ===== */
.audit-logs-card { border-radius: 14px !important; }
.log-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.log-auditor { font-weight: 600; color: #455a64; }
.log-comment { color: #78909c; margin-left: 6px; }

/* ===== PDF 预览样式 ===== */
.pdf-viewer-container {
  width: 100%; /* 必须撑满父级 */
  height: 950px;
  overflow-y: auto;
  background: #525659;
  border-radius: 8px;
  padding: 0;
  display: flex;
  justify-content: center;
}

.pdf-render {
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  background: #fff;
}

.pdf-loading {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

@media (max-width: 1000px) {
  .resource-hero { flex-direction: column; }
  .hero-left { width: 100% !important; }
  .media-box { width: 100% !important; }
}
</style>
