<template>
  <div class="login-page">
    <el-tabs v-model="activeTab" class="login-tabs">
      <el-tab-pane label="账号登录" name="account">
        <el-form
          ref="accountFormRef"
          :model="accountForm"
          :rules="accountRules"
          size="large"
          @submit.prevent="handleAccountLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="accountForm.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="accountForm.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleAccountLogin"
            />
          </el-form-item>
          <el-button
            type="primary"
            class="submit-btn"
            :loading="loading"
            @click="handleAccountLogin"
          >
            登 录
          </el-button>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="手机号登录" name="phone">
        <el-form
          ref="phoneFormRef"
          :model="phoneForm"
          :rules="phoneRules"
          size="large"
          @submit.prevent="handlePhoneLogin"
        >
          <el-form-item prop="phone">
            <el-input
              v-model="phoneForm.phone"
              placeholder="请输入手机号"
              :prefix-icon="Iphone"
              clearable
            />
          </el-form-item>
          <el-form-item prop="code">
            <el-input
              v-model="phoneForm.code"
              placeholder="请输入验证码"
              :prefix-icon="Key"
              clearable
            >
              <template #append>
                <el-button
                  :disabled="codeCooldown > 0"
                  @click="handleSendCode"
                >
                  {{ codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-button
            type="primary"
            class="submit-btn"
            :loading="loading"
            @click="handlePhoneLogin"
          >
            登 录
          </el-button>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <div class="login-footer">
      还没有账号？
      <el-link type="primary" @click="showRegister = true">立即注册</el-link>
    </div>

    <!-- 注册对话框 -->
    <el-dialog v-model="showRegister" title="注册账号" width="400px" :append-to-body="true">
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        size="large"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="registerForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码（6-20位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入邮箱（选填）" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRegister = false">取消</el-button>
        <el-button type="primary" :loading="registerLoading" @click="handleRegister">注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { User, Lock, Iphone, Key } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { phoneCodeLogin, sendCode, register } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeTab = ref('account')
const loading = ref(false)
const registerLoading = ref(false)
const showRegister = ref(false)
const codeCooldown = ref(0)

// 账号登录表单
const accountFormRef = ref<FormInstance>()
const accountForm = reactive({ username: '', password: '' })
const accountRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// 手机号登录表单
const phoneFormRef = ref<FormInstance>()
const phoneForm = reactive({ phone: '', code: '' })
const phoneRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

// 注册表单
const registerFormRef = ref<FormInstance>()
const registerForm = reactive({ username: '', password: '', email: '' })
const registerRules: FormRules = {
  username: [{ required: true, min: 3, max: 20, message: '用户名 3-20 个字符', trigger: 'blur' }],
  password: [{ required: true, min: 6, max: 20, message: '密码 6-20 个字符', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

// 账号密码登录
async function handleAccountLogin() {
  if (!await accountFormRef.value?.validate().catch(() => false)) return
  loading.value = true
  try {
    await authStore.login(accountForm)
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}

// 发送验证码
async function handleSendCode() {
  if (!phoneForm.phone || !/^1[3-9]\d{9}$/.test(phoneForm.phone)) {
    ElMessage.warning('请先输入正确的手机号')
    return
  }
  const res = await sendCode(phoneForm.phone)
  // 开发模式下自动填入验证码
  if (res.code) phoneForm.code = res.code
  ElMessage.success('验证码已发送')
  codeCooldown.value = 60
  const timer = setInterval(() => {
    if (--codeCooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

// 手机号验证码登录
async function handlePhoneLogin() {
  if (!await phoneFormRef.value?.validate().catch(() => false)) return
  loading.value = true
  try {
    const res = await phoneCodeLogin(phoneForm)
    authStore.token = res.token
    authStore.userInfo = {
      userId: res.userId, username: res.username, realName: res.realName,
      avatar: res.avatar, phone: phoneForm.phone, email: '',
      roles: res.roles, schoolId: res.schoolId, schoolName: res.schoolName, status: 1,
    }
    router.replace('/home')
  } finally {
    loading.value = false
  }
}

// 注册
async function handleRegister() {
  if (!await registerFormRef.value?.validate().catch(() => false)) return
  registerLoading.value = true
  try {
    await register(registerForm)
    ElMessage.success('注册成功，请登录')
    showRegister.value = false
    accountForm.username = registerForm.username
    activeTab.value = 'account'
  } finally {
    registerLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>
