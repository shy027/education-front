<template>
  <div class="school-info-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">学校信息管理</h2>
        <p class="page-desc">编辑并维护您所属学校的展示信息，包括 Logo、简介及联系方式</p>
      </div>
      <el-button type="primary" :loading="saving" :icon="Check" @click="handleSave" class="red-btn">
        保存更改
      </el-button>
    </div>

    <div class="info-container" v-loading="loading">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="info-form"
      >
        <el-row :gutter="32">
          <!-- 左侧：基本信息 -->
          <el-col :span="16">
            <el-card shadow="never" class="info-card">
              <template #header>
                <div class="card-header">
                  <span><el-icon><InfoFilled /></el-icon> 基本信息</span>
                </div>
              </template>
              
              <el-form-item label="学校名称" prop="schoolName">
                <el-input v-model="form.schoolName" placeholder="请输入学校全称" />
              </el-form-item>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="学校代码" prop="schoolCode">
                    <el-input v-model="form.schoolCode" placeholder="如：EDU1001" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="联系电话" prop="contactPhone">
                    <el-input v-model="form.contactPhone" placeholder="请输入单位联系电话" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="所属省份" prop="province">
                    <el-input v-model="form.province" placeholder="如：广东省" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="所在城市" prop="city">
                    <el-input v-model="form.city" placeholder="如：深圳市" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="详细地址" prop="address">
                <el-input v-model="form.address" placeholder="请输入学校详细办公地址" />
              </el-form-item>

              <el-form-item label="学校简介" prop="description">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="6"
                  placeholder="请输入学校的简要介绍，将展示在院校详情页..."
                />
              </el-form-item>
            </el-card>
          </el-col>

          <!-- 右侧：Logo 与形象 -->
          <el-col :span="8">
            <el-card shadow="never" class="info-card">
              <template #header>
                <div class="card-header">
                  <span><el-icon><Picture /></el-icon> 学校标识</span>
                </div>
              </template>
              
              <div class="logo-upload-section">
                <el-upload
                  class="logo-uploader"
                  :show-file-list="false"
                  :before-upload="handleLogoUpload"
                  accept="image/*"
                >
                  <img v-if="form.logoUrl" :src="form.logoUrl" class="school-logo-preview" />
                  <div v-else class="logo-placeholder">
                    <el-icon><Plus /></el-icon>
                    <span>上传 Logo</span>
                  </div>
                </el-upload>
                <p class="upload-tip">建议尺寸 200x200px，支持 JPG/PNG</p>
              </div>
            </el-card>

            <el-card shadow="never" class="info-card status-card">
              <div class="stat-item">
                <div class="stat-label">运行状态</div>
                <el-tag type="success" effect="dark">运营中</el-tag>
              </div>
              <div class="stat-item">
                <div class="stat-label">数据权限</div>
                <div class="stat-val">本校全量</div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadRawFile } from 'element-plus'
import { Check, Plus, InfoFilled, Picture } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getSchoolDetail, updateSchool } from '@/api/school'
import type { SchoolItem, SchoolRequest } from '@/api/school'
import { uploadAvatar as uploadFile } from '@/api/user' // 复用头像上传逻辑

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<SchoolRequest & { id?: string | number }>({
  schoolName: '',
  schoolCode: '',
  province: '',
  city: '',
  address: '',
  contactPhone: '',
  logoUrl: '',
  description: '',
})

const rules: FormRules = {
  schoolName: [{ required: true, message: '请输入学校名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入学校简介', trigger: 'blur' }],
}

async function fetchInfo() {
  const schoolId = authStore.userInfo?.schoolId
  if (!schoolId) {
    ElMessage.error('无法获取您的所属学校信息')
    return
  }
  
  loading.value = true
  try {
    const res = await getSchoolDetail(String(schoolId))
    form.id = res.id
    form.schoolName = res.schoolName
    form.schoolCode = res.schoolCode
    form.province = res.province
    form.city = res.city
    form.address = res.address
    form.contactPhone = res.contactPhone
    form.logoUrl = res.logoUrl
    form.description = res.description
  } finally {
    loading.value = false
  }
}

async function handleLogoUpload(file: UploadRawFile) {
  const isImg = file.type.startsWith('image/')
  if (!isImg) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  
  try {
    // 借用头像上传接口 (通常是通用的文件上传)
    const res = await uploadFile(file, authStore.userInfo?.userId || 0)
    form.logoUrl = res.url
    ElMessage.success('Logo 已成功上传，记得保存更改')
  } catch (err) {
    // Error handled by Interceptor
  }
  return false
}

async function handleSave() {
  if (!formRef.value) return
  if (!form.id) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        await updateSchool(form.id!, {
          schoolName: form.schoolName,
          schoolCode: form.schoolCode,
          province: form.province,
          city: form.city,
          address: form.address,
          contactPhone: form.contactPhone,
          logoUrl: form.logoUrl,
          description: form.description
        })
        ElMessage.success('学校信息已更新')
        // 刷新本地缓存的学校名称
        if (authStore.userInfo) {
           authStore.userInfo.schoolName = form.schoolName
        }
      } finally {
        saving.value = false
      }
    }
  })
}

onMounted(() => {
  fetchInfo()
})
</script>

<style scoped>
.school-info-page {
  padding: 4px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.info-card {
  border-radius: 12px;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #37474f;
}

.card-header .el-icon { color: #d32f2f; }

/* Logo 上传 */
.logo-upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.logo-uploader {
  width: 160px;
  height: 160px;
  border: 2px dashed #e0e0e0;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.2s;
  cursor: pointer;
}

.logo-uploader:hover {
  border-color: #ff5252;
  background: #fffafa;
}

.school-logo-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #90a4ae;
  gap: 10px;
}

.logo-placeholder .el-icon { font-size: 32px; }

.upload-tip {
  margin-top: 16px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

/* 状态统计卡片 */
.status-card {
  background: #fafafa;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-item:last-child { margin-bottom: 0; }

.stat-label { font-size: 13px; color: #546e7a; }
.stat-val { font-size: 13px; font-weight: 600; color: #263238; }

.red-btn {
  background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%) !important;
  border: none !important;
  font-weight: 600;
  padding: 0 24px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  padding-bottom: 4px;
}
</style>
