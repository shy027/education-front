<template>
  <div class="create-resource-page">
    <div class="page-header">
      <el-button text :icon="ArrowLeft" @click="$router.push('/resource')">返回资源库</el-button>
      <h2 class="page-title">发布资源</h2>
    </div>

    <div class="create-layout">
      <!-- 左：表单 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        size="large"
        class="create-form-card"
      >
        <!-- 资源类型选择 -->
        <div class="type-selector">
          <div
            v-for="t in RESOURCE_TYPES"
            :key="t.value"
            class="type-option"
            :class="{ active: form.resourceType === t.value }"
            @click="form.resourceType = t.value"
          >
            <el-icon :size="26" :color="t.color"><component :is="t.icon" /></el-icon>
            <span>{{ t.label }}</span>
          </div>
        </div>

        <el-divider />

        <!-- 基本信息 -->
        <el-form-item label="资源标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入资源标题" clearable maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="资源简介">
          <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="一句话描述该资源（选填）" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="资源分类">
          <el-cascader
            v-model="selectedCategory"
            :options="categoryOptions"
            :props="{ value: 'id', label: 'categoryName', children: 'children', checkStrictly: true, emitPath: false }"
            placeholder="选择分类（选填）"
            clearable
            style="width: 100%"
            @change="(val: string) => form.categoryId = val || undefined"
          />
        </el-form-item>

        <el-form-item label="标签" prop="tagIds">
          <el-select v-model="form.tagIds" multiple placeholder="选择标签（必填，最多 5 个）" filterable collapse-tags style="width:100%">
            <el-option v-for="t in enabledTags" :key="t.id" :label="t.tagName" :value="t.id" />
          </el-select>
        </el-form-item>

        <!-- 封面图 -->
        <el-form-item label="封面图片">
          <el-upload
            :show-file-list="false"
            :before-upload="handleCoverUpload"
            accept="image/*"
            class="cover-uploader"
          >
            <img v-if="form.coverUrl" :src="form.coverUrl" class="cover-preview" />
            <div v-else class="cover-placeholder">
              <el-icon :size="28" color="#90a4ae"><Plus /></el-icon>
              <span>上传封面</span>
            </div>
          </el-upload>
          <div class="upload-tip">建议尺寸 720×480，支持 jpg/png/webp，≤5MB</div>
        </el-form-item>

        <!-- 文章：正文 -->
        <el-form-item v-if="form.resourceType === 1" label="正文内容">
          <el-input v-model="form.content" type="textarea" :rows="12" placeholder="请输入文章正文..." resize="none" />
        </el-form-item>

        <!-- 文件上传（视频/文档/音频） -->
        <el-form-item v-if="form.resourceType !== 1" label="资源文件" prop="fileUrl">
          <el-upload
            v-if="!form.fileUrl"
            :show-file-list="false"
            :before-upload="handleFileUpload"
            :accept="fileAccept"
            drag
            class="file-dragger"
          >
            <el-icon :size="40" color="#d32f2f"><component :is="typeIconMap[form.resourceType]" /></el-icon>
            <div class="dragger-tip">
              <span>拖拽文件到此处，或 <em>点击上传</em></span>
              <div class="dragger-sub">{{ fileTypeTip }}</div>
            </div>
          </el-upload>
          <div v-else class="file-uploaded">
            <el-icon color="#388e3c"><CircleCheckFilled /></el-icon>
            <span>文件已上传</span>
            <el-button text type="danger" @click="form.fileUrl = ''">重新上传</el-button>
          </div>
          <el-progress v-if="uploadProgress > 0 && uploadProgress < 100" :percentage="uploadProgress" :stroke-width="6" color="#d32f2f" />
        </el-form-item>

        <!-- 发布操作 -->
        <el-form-item>
          <el-button
            type="primary"
            class="submit-btn"
            :loading="submitting"
            @click="handleSubmit('draft')"
          >保存草稿</el-button>
          <el-button
            class="submit-btn publish-btn"
            :loading="submitting"
            @click="handleSubmit('publish')"
          >{{ authStore.isAdmin ? '发布资源' : '发布并提交审核' }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 右：预览 -->
      <div class="preview-panel">
        <div class="preview-title">预览</div>
        <div class="preview-card">
          <div class="preview-cover" :class="`bg-type-${form.resourceType}`">
            <img v-if="form.coverUrl" :src="form.coverUrl" />
            <el-icon v-else :size="36" color="rgba(255,255,255,0.7)"><component :is="typeIconMap[form.resourceType]" /></el-icon>
          </div>
          <div class="preview-info">
            <div class="preview-name">{{ form.title || '资源标题' }}</div>
            <div class="preview-summary">{{ form.summary || '资源简介...' }}</div>
            <div class="preview-meta">{{ authStore.userInfo?.realName || authStore.userInfo?.username }} · 刚刚发布</div>
          </div>
        </div>
        <el-alert type="info" :closable="false" show-icon style="margin-top: 16px">
          <template #title>发布说明</template>
          <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.8">
            <li>保存草稿：仅自己可见</li>
            <li>提交审核：等待管理员审核后公开展示</li>
            <li>审核通过后资源进入资源库供所有人查看</li>
          </ul>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, markRaw, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadRawFile } from 'element-plus'
import {
  ArrowLeft, Plus, Document, VideoPlay, Headset, CircleCheckFilled, Reading,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  createResource, updateResource, getResourceDetail,
  submitResourceForAudit, getCategoryTree, getEnabledTags,
  uploadResourceImage, uploadResourceVideo, uploadResourcePdf,
} from '@/api/resource'
import type { CategoryNode, TagItem, ResourceCreateReq } from '@/api/resource'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const resourceId = computed(() => route.params.id as string)
const isEdit = computed(() => !!resourceId.value)

// ─── 资源类型 ───
const RESOURCE_TYPES = [
  { label: '文章', value: 1, icon: markRaw(Reading), color: '#d32f2f' },
  { label: '视频', value: 2, icon: markRaw(VideoPlay), color: '#1976d2' },
  { label: '文档', value: 3, icon: markRaw(Document), color: '#388e3c' },
  { label: '音频', value: 4, icon: markRaw(Headset), color: '#f57c00' },
]

const typeIconMap: Record<number, ReturnType<typeof markRaw>> = {
  1: markRaw(Reading), 2: markRaw(VideoPlay), 3: markRaw(Document), 4: markRaw(Headset),
}

const fileAccept = computed(() => {
  return { 2: 'video/*', 3: '.pdf,.doc,.docx,.ppt,.pptx', 4: 'audio/*' }[form.resourceType] ?? ''
})

const fileTypeTip = computed(() => {
  return {
    2: '支持 mp4/avi/mov，建议 ≤500MB',
    3: '支持 pdf/doc/docx/ppt/pptx，≤50MB',
    4: '支持 mp3/m4a/wav，≤100MB',
  }[form.resourceType] ?? ''
})

// ─── 表单 ───
const formRef = ref<FormInstance>()
const submitting = ref(false)
const uploadProgress = ref(0)
const selectedCategory = ref<string | undefined>(undefined)

const form = reactive<ResourceCreateReq & { resourceType: number }>({
  title: '',
  summary: '',
  content: '',
  coverUrl: '',
  categoryId: undefined,
  tagIds: [],
  resourceType: 1,
  fileUrl: '',
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入资源标题', trigger: 'blur' },
    { max: 100, message: '标题不超过 100 字', trigger: 'blur' },
  ],
  tagIds: [
    { type: 'array', required: true, message: '请至少选择一个标签', trigger: 'change' },
  ],
  fileUrl: [
    {
      validator: (_: unknown, v: string, cb: (err?: Error) => void) => {
        if (form.resourceType !== 1 && !v) cb(new Error('请上传资源文件'))
        else cb()
      },
      trigger: 'change',
    },
  ],
}

// ─── 分类/标签 ───
const categoryOptions = ref<CategoryNode[]>([])
const enabledTags = ref<TagItem[]>([])

// ─── 封面上传 ───
async function handleCoverUpload(file: UploadRawFile) {
  if (file.size > 5 * 1024 * 1024) { ElMessage.error('封面图不超过 5MB'); return false }
  try {
    const res = await uploadResourceImage(file)
    form.coverUrl = res.fileUrl
  } catch { /* 统一处理 */ }
  return false
}

// ─── 文件上传 ───
async function handleFileUpload(file: UploadRawFile) {
  uploadProgress.value = 10
  try {
    let url = ''
    if (form.resourceType === 2) {
      const res = await uploadResourceVideo(file)
      url = res.fileUrl
    } else if (form.resourceType === 4) {
      const res = await uploadResourceVideo(file)   // 音频复用 video 接口或专用接口
      url = res.fileUrl
    } else {
      const res = await uploadResourcePdf(file)
      url = res.fileUrl
    }
    form.fileUrl = url
    uploadProgress.value = 100
  } catch {
    uploadProgress.value = 0
  }
  return false
}

async function fetchResourceDetail() {
  if (!isEdit.value) return
  submitting.value = true
  try {
    const data = await getResourceDetail(resourceId.value as any)
    // 后端返回的是 ResourceDetailResponse，需要映射到 ResourceCreateReq
    form.title = data.title
    form.summary = data.summary || ''
    form.content = data.content || ''
    form.coverUrl = data.coverUrl || ''
    form.categoryId = data.categoryId
    form.resourceType = data.resourceType
    form.fileUrl = data.attachments?.[0]?.fileUrl || ''
    form.tagIds = data.tags?.map(t => t.id) || []
    selectedCategory.value = data.categoryId
  } catch (err) {
    ElMessage.error('获取资源详情失败')
    router.push('/resource')
  } finally {
    submitting.value = false
  }
}

// ─── 提交 ───
async function handleSubmit(mode: 'draft' | 'publish') {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return
  submitting.value = true
  try {
    const payload: any = {
      title: form.title,
      summary: form.summary || undefined,
      content: form.content || undefined,
      coverUrl: form.coverUrl || undefined,
      categoryId: form.categoryId,
      tagIds: form.tagIds?.length ? form.tagIds : undefined,
      resourceType: form.resourceType,
      fileUrl: form.fileUrl || undefined,
    }
    
    let id: any = resourceId.value
    if (isEdit.value) {
      await updateResource(id as any, payload)
      ElMessage.success('更新成功')
    } else {
      id = await createResource(payload)
    }

    if (mode === 'publish') {
      await submitResourceForAudit(id)
      if (authStore.isAdmin) {
        ElMessage.success('资源已成功发布')
      } else {
        ElMessage.success('资源已发布并提交审核，请等待审核结果')
      }
    } else if (!isEdit.value) {
      ElMessage.success('草稿已保存')
    }
    router.push(`/resource/${id}`)
  } finally { submitting.value = false }
}

onMounted(async () => {
  const [tree, tags] = await Promise.all([getCategoryTree(), getEnabledTags()])
  categoryOptions.value = tree
  enabledTags.value = tags
  
  if (isEdit.value) {
    await fetchResourceDetail()
  }
})
</script>

<style scoped>
.create-resource-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { display: flex; align-items: center; gap: 16px; }
.page-title  { margin: 0; font-size: 20px; font-weight: 700; color: #263238; }

/* ===== 布局 ===== */
.create-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }

/* ===== 表单卡片 ===== */
.create-form-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

/* ===== 类型选择 ===== */
.type-selector { display: flex; gap: 12px; margin-bottom: 4px; }

.type-option {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 16px 12px; border: 2px solid #f0f0f0; border-radius: 12px;
  cursor: pointer; transition: all 0.2s; font-size: 13px; color: #78909c;
}
.type-option:hover { border-color: #ffcdd2; color: #d32f2f; background: #fff8f8; }
.type-option.active { border-color: #d32f2f; color: #d32f2f; background: #ffebee; font-weight: 700; }

/* ===== 封面上传 ===== */
.cover-uploader { cursor: pointer; }
.cover-preview { width: 180px; height: 120px; object-fit: cover; border-radius: 10px; display: block; }

.cover-placeholder {
  width: 180px; height: 120px;
  border: 2px dashed #e0e0e0; border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: #90a4ae; font-size: 13px; transition: border-color 0.2s;
}
.cover-placeholder:hover { border-color: #d32f2f; color: #d32f2f; }

.upload-tip { font-size: 12px; color: #b0bec5; margin-top: 6px; }

/* ===== 文件拖拽 ===== */
.file-dragger { width: 100%; }

:deep(.file-dragger .el-upload-dragger) {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: #fafafa; border-color: #e0e0e0; border-radius: 12px; padding: 32px;
}
:deep(.file-dragger .el-upload-dragger:hover) { border-color: #d32f2f; background: #fff8f8; }

.dragger-tip { text-align: center; }
.dragger-tip span { font-size: 14px; color: #546e7a; }
.dragger-tip em { color: #d32f2f; font-style: normal; }
.dragger-sub { font-size: 12px; color: #b0bec5; margin-top: 4px; }

.file-uploaded { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #388e3c; }

/* ===== 提交按钮 ===== */
.submit-btn { min-width: 130px; border-radius: 8px !important; }

.publish-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; color: #fff !important;
}

/* ===== 预览面板 ===== */
.preview-panel {
  position: sticky; top: 72px;
  background: #fff;
  border-radius: 16px; padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  display: flex; flex-direction: column; gap: 0;
}

.preview-title { font-size: 14px; font-weight: 700; color: #d32f2f; margin-bottom: 14px; }

.preview-card { border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; }

.preview-cover {
  height: 130px; display: flex; align-items: center; justify-content: center;
}
.preview-cover img { width: 100%; height: 100%; object-fit: cover; }

.bg-type-1 { background: linear-gradient(135deg, #b71c1c, #ff5252); }
.bg-type-2 { background: linear-gradient(135deg, #1565c0, #42a5f5); }
.bg-type-3 { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
.bg-type-4 { background: linear-gradient(135deg, #e65100, #ffa726); }

.preview-info { padding: 12px; }
.preview-name    { font-size: 14px; font-weight: 700; color: #263238; margin-bottom: 4px; }
.preview-summary { font-size: 12px; color: #90a4ae; margin-bottom: 6px; }
.preview-meta    { font-size: 11px; color: #b0bec5; }

@media (max-width: 900px) {
  .create-layout { grid-template-columns: 1fr; }
  .preview-panel { position: relative; top: 0; }
}
</style>
