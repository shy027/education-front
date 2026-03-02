<template>
  <div class="profile-page">
    <!-- 左侧导航 -->
    <aside class="profile-aside">
      <!-- 头像与基本信息 -->
      <div class="aside-header">
        <div class="avatar-wrap">
          <el-avatar :size="80" :src="userInfo?.avatar" class="user-avatar">
            {{ userInfo?.realName?.charAt(0) || userInfo?.username?.charAt(0) }}
          </el-avatar>
          <el-upload
            :show-file-list="false"
            :before-upload="handleAvatarUpload"
            accept="image/*"
            class="avatar-upload-btn"
          >
            <el-button circle size="small" class="camera-btn">
              <el-icon><Camera /></el-icon>
            </el-button>
          </el-upload>
        </div>
        <h3 class="aside-name">{{ userInfo?.realName || userInfo?.username }}</h3>
        <el-tag class="role-tag" :color="roleColor" size="small">{{ roleLabel }}</el-tag>
        <p class="aside-school">{{ userInfo?.schoolName || '暂无学校信息' }}</p>
      </div>

      <!-- 导航菜单 -->
      <nav class="aside-nav">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: currentSection === item.key }"
          @click="currentSection = item.key"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- 右侧内容 -->
    <main class="profile-main">
      <!-- 个人概览 -->
      <section v-show="currentSection === 'overview'" class="section-content">
        <div class="section-card">
          <div class="card-header">
            <h2>个人概览</h2>
            <el-tag :color="roleColor" size="small">{{ roleLabel }}</el-tag>
          </div>

          <div class="overview-grid">
            <!-- 基本信息 -->
            <div class="info-block">
              <div class="info-avatar-row">
                <el-avatar :size="64" :src="userInfo?.avatar">
                  {{ userInfo?.realName?.charAt(0) }}
                </el-avatar>
                <div>
                  <div class="info-name">{{ userInfo?.realName || userInfo?.username }}</div>
                  <div class="info-sub">{{ userInfo?.username }}</div>
                </div>
              </div>
              <div class="info-list">
                <div class="info-row">
                  <span class="info-label">所属学校</span>
                  <span>{{ userInfo?.schoolName || '—' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">邮箱</span>
                  <span>{{ userInfo?.email || '—' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">手机号</span>
                  <span>{{ maskPhone(userInfo?.phone) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">系统角色</span>
                  <span>{{ roleLabel }}</span>
                </div>
              </div>
              <el-button class="red-btn" @click="currentSection = 'edit'">
                编辑个人信息
              </el-button>
            </div>

            <!-- 统计面板（根据角色显示不同数据） -->
            <div class="stat-block">
              <h3 class="stat-title">
                {{ authStore.isTeacher ? '教学统计' : authStore.isStudent ? '学习统计' : '平台统计' }}
              </h3>
              <div class="stat-grid">
                <div v-for="s in statItems" :key="s.label" class="stat-item">
                  <div class="stat-value">{{ s.value }}</div>
                  <div class="stat-label">{{ s.label }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 编辑个人信息 -->
      <section v-show="currentSection === 'edit'" class="section-content">
        <div class="section-card">
          <div class="card-header">
            <h2>编辑个人信息</h2>
            <span class="card-tip">修改后立即生效</span>
          </div>

          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-width="90px"
            size="large"
            class="profile-form"
          >
            <el-form-item label="真实姓名" prop="realName">
              <el-input v-model="profileForm.realName" placeholder="请输入真实姓名" clearable />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="profileForm.email" placeholder="请输入邮箱" clearable />
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input
                v-model="profileForm.phone"
                placeholder="请输入手机号"
                clearable
                maxlength="11"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                class="red-btn save-btn"
                :loading="profileLoading"
                @click="handleSaveProfile"
              >
                保存修改
              </el-button>
              <el-button size="large" style="margin-left: 12px" @click="resetProfileForm">
                取消
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </section>

      <!-- 修改密码 -->
      <section v-show="currentSection === 'security'" class="section-content">
        <div class="section-card">
          <div class="card-header">
            <h2>账号与安全</h2>
            <span class="card-tip">建议定期更换密码</span>
          </div>

          <div class="security-grid">
            <!-- 修改密码 -->
            <div class="security-block">
              <h3 class="security-block-title">
                <el-icon><Lock /></el-icon> 修改密码
              </h3>
              <el-form
                ref="pwdFormRef"
                :model="pwdForm"
                :rules="pwdRules"
                label-width="90px"
                size="large"
                class="profile-form"
              >
                <el-form-item label="当前密码" prop="oldPassword">
                  <el-input
                    v-model="pwdForm.oldPassword"
                    type="password"
                    placeholder="请输入当前密码"
                    show-password
                  />
                </el-form-item>
                <el-form-item label="新密码" prop="newPassword">
                  <el-input
                    v-model="pwdForm.newPassword"
                    type="password"
                    placeholder="至少 6 位字符"
                    show-password
                  />
                </el-form-item>
                <el-form-item label="确认密码" prop="confirmPwd">
                  <el-input
                    v-model="pwdForm.confirmPwd"
                    type="password"
                    placeholder="请再次输入新密码"
                    show-password
                    @keyup.enter="handleChangePwd"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    class="red-btn save-btn"
                    :loading="pwdLoading"
                    @click="handleChangePwd"
                  >
                    更新密码
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 安全说明 -->
            <div class="security-block">
              <h3 class="security-block-title">
                <el-icon><InfoFilled /></el-icon> 安全说明
              </h3>
              <ul class="security-tips">
                <li v-for="tip in securityTips" :key="tip">
                  <span class="tip-dot" />{{ tip }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, markRaw, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadRawFile } from 'element-plus'
import {
  Camera,
  Lock,
  ViewGrid,
  Edit,
  ShieldLock,
  InfoFilled,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { updateProfile, updatePassword } from '@/api/auth'
import { uploadAvatar } from '@/api/user'
import type { UpdateProfileRequest, UpdatePasswordRequest } from '@/types/user'

const authStore = useAuthStore()
const userInfo = computed(() => authStore.userInfo)

// ───── 角色显示 ─────
const ROLE_MAP: Record<string, { label: string; color: string }> = {
  ADMIN: { label: '管理员', color: '#ffebee' },
  SCHOOL_LEADER: { label: '学校领导', color: '#fff3e0' },
  TEACHER: { label: '教师', color: '#ffebee' },
  ASSISTANT: { label: '助教', color: '#f3e5f5' },
  STUDENT: { label: '学生', color: '#e8f5e9' },
}

const roleLabel = computed(() => {
  const role = userInfo.value?.roles?.[0]
  return role ? (ROLE_MAP[role]?.label ?? role) : '未知'
})

const roleColor = computed(() => {
  const role = userInfo.value?.roles?.[0]
  return role ? (ROLE_MAP[role]?.color ?? '#f5f5f5') : '#f5f5f5'
})

// ───── 导航 ─────
const currentSection = ref<'overview' | 'edit' | 'security'>('overview')

const navItems = [
  { key: 'overview', label: '个人概览', icon: markRaw(ViewGrid) },
  { key: 'edit', label: '编辑信息', icon: markRaw(Edit) },
  { key: 'security', label: '账号安全', icon: markRaw(ShieldLock) },
] as const

// ───── 统计（静态占位，后续可接 API） ─────
const statItems = computed(() => {
  if (authStore.isTeacher) {
    return [
      { label: '在授课程', value: '—' },
      { label: '学生数量', value: '—' },
      { label: '发布任务', value: '—' },
      { label: '研讨主题', value: '—' },
    ]
  }
  return [
    { label: '加入课程', value: '—' },
    { label: '完成作业', value: '—' },
    { label: '参与讨论', value: '—' },
    { label: '学习时长', value: '—' },
  ]
})

// ───── 手机号脱敏 ─────
function maskPhone(phone?: string): string {
  if (!phone) return '—'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// ───── 头像上传 ─────
async function handleAvatarUpload(file: UploadRawFile) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    ElMessage.error('请上传 JPG / PNG / WebP / GIF 格式图片')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('头像文件不能超过 5MB')
    return false
  }
  try {
    const res = await uploadAvatar(file, userInfo.value!.userId)
    await updateProfile({ avatar: res.url })
    authStore.userInfo!.avatar = res.url
    ElMessage.success('头像更新成功')
  } catch {
    // 统一错误由 request.ts 处理
  }
  return false // 阻止 el-upload 默认上传
}

// ───── 编辑个人信息 ─────
const profileFormRef = ref<FormInstance>()
const profileLoading = ref(false)

const profileForm = reactive<UpdateProfileRequest>({
  realName: '',
  email: '',
  phone: '',
})

const profileRules: FormRules = {
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  phone: [{ pattern: /^(1[3-9]\d{9})?$/, message: '手机号格式不正确', trigger: 'blur' }],
}

/** 初始化表单数据 */
function resetProfileForm() {
  profileForm.realName = userInfo.value?.realName ?? ''
  profileForm.email = userInfo.value?.email ?? ''
  profileForm.phone = userInfo.value?.phone ?? ''
  profileFormRef.value?.clearValidate()
}

async function handleSaveProfile() {
  if (!(await profileFormRef.value?.validate().catch(() => false))) return
  profileLoading.value = true
  try {
    await updateProfile({
      realName: profileForm.realName || undefined,
      email: profileForm.email || undefined,
      phone: profileForm.phone || undefined,
    })
    // 刷新 store 中的用户信息
    await authStore.fetchCurrentUser()
    ElMessage.success('个人信息已更新')
    currentSection.value = 'overview'
  } finally {
    profileLoading.value = false
  }
}

// ───── 修改密码 ─────
const pwdFormRef = ref<FormInstance>()
const pwdLoading = ref(false)

const pwdForm = reactive<UpdatePasswordRequest & { confirmPwd: string }>({
  oldPassword: '',
  newPassword: '',
  confirmPwd: '',
})

/** 确认密码验证器 */
const validateConfirm = (_: unknown, value: string, cb: (err?: Error) => void) => {
  if (value !== pwdForm.newPassword) cb(new Error('两次输入的密码不一致'))
  else cb()
}

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPwd: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

async function handleChangePwd() {
  if (!(await pwdFormRef.value?.validate().catch(() => false))) return
  pwdLoading.value = true
  try {
    await updatePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功，请重新登录')
    // 自动退出并跳转登录
    setTimeout(() => {
      authStore.logout()
      window.location.hash = '#/login'
    }, 1500)
  } finally {
    pwdLoading.value = false
  }
}

// ───── 安全提示 ─────
const securityTips = [
  '建议每 90 天更换一次密码，使用 12 位以上含大小写和数字的组合',
  '请勿将密码告知他人或在多个平台重复使用同一密码',
  '若发现账号异常，请立即修改密码并联系管理员',
  '操作记录将保留 12 个月，便于合规追溯',
]

onMounted(resetProfileForm)
</script>

<style scoped>
/* ===== 页面布局 ===== */
.profile-page {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* ===== 左侧 Aside ===== */
.profile-aside {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
  position: sticky;
  top: 72px;
}

.aside-header {
  background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 60%, #ff5252 100%);
  padding: 24px 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.avatar-wrap {
  position: relative;
  margin-bottom: 4px;
}

.user-avatar {
  border: 3px solid rgba(255, 255, 255, 0.4);
}

.camera-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 26px;
  height: 26px;
  background: #d32f2f !important;
  border-color: #fff !important;
  color: #fff !important;
  border-radius: 50% !important;
}

.aside-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.role-tag {
  color: #d32f2f !important;
  border: none;
  font-size: 12px;
  font-weight: 600;
}

.aside-school {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  text-align: center;
}

.aside-nav {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  color: #546e7a;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item .el-icon { font-size: 18px; color: #90a4ae; transition: color 0.2s; }

.nav-item:hover {
  background: #fbe9e7;
  color: #b71c1c;
}
.nav-item:hover .el-icon { color: #b71c1c; }

.nav-item.active {
  background: linear-gradient(90deg, #ffcdd2, #ffeaea);
  color: #b71c1c;
  font-weight: 600;
}
.nav-item.active .el-icon { color: #b71c1c; }

/* ===== 主内容区 ===== */
.profile-main { flex: 1; min-width: 0; }

.section-content { animation: fadeInUp 0.2s ease; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.card-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #263238; }
.card-tip { font-size: 13px; color: #90a4ae; }

/* ===== 概览 ===== */
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.info-block, .stat-block {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
}

.info-avatar-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.info-name { font-size: 16px; font-weight: 700; color: #263238; }
.info-sub { font-size: 12px; color: #90a4ae; margin-top: 2px; }

.info-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

.info-row {
  display: flex;
  font-size: 14px;
  color: #37474f;
}

.info-label {
  width: 76px;
  flex-shrink: 0;
  color: #78909c;
}

.stat-title {
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  margin: 0 0 16px;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  background: #ffebee;
  border-radius: 10px;
  padding: 14px 10px;
  text-align: center;
}

.stat-value { font-size: 24px; font-weight: 800; color: #d32f2f; line-height: 1; }
.stat-label { font-size: 12px; color: #78909c; margin-top: 4px; }

/* ===== 表单 ===== */
.profile-form { max-width: 480px; }

/* 表单 Input Focus 红色 */
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #d32f2f inset !important;
}

.save-btn { min-width: 120px; }

/* ===== 安全 ===== */
.security-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.security-block {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
}

.security-block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  margin: 0 0 16px;
}

.security-block-title .el-icon { color: #d32f2f; }

.security-tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.security-tips li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #546e7a;
  line-height: 1.6;
}

.tip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d32f2f;
  flex-shrink: 0;
  margin-top: 6px;
}

/* ===== 通用红色按钮 ===== */
.red-btn {
  background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: 600;
  height: 40px;
  padding: 0 20px;
  transition: all 0.2s;
}

.red-btn:hover {
  background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%) !important;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.35) !important;
}

/* 响应式 */
@media (max-width: 900px) {
  .profile-page { flex-direction: column; }
  .profile-aside { width: 100%; position: relative; top: 0; }
  .overview-grid, .security-grid { grid-template-columns: 1fr; }
}
</style>
