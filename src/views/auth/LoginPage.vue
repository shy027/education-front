<template>
  <div class="login-page">
    <!-- Tab 切换 -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'login' }"
        @click="activeTab = 'login'"
      >
        登录
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'register' }"
        @click="activeTab = 'register'"
      >
        注册
      </button>
    </div>

    <!-- 登录表单 -->
    <div v-if="activeTab === 'login'">
      <!-- 子 Tab：账号 / 手机号 -->
      <div class="login-sub-tabs">
        <span
          :class="{ active: loginMode === 'account' }"
          @click="loginMode = 'account'"
        >账号密码</span>
        <span
          :class="{ active: loginMode === 'phone' }"
          @click="loginMode = 'phone'"
        >手机号登录</span>
      </div>

      <!-- 账号密码登录 -->
      <el-form
        v-if="loginMode === 'account'"
        ref="accountFormRef"
        :model="accountForm"
        :rules="accountRules"
        size="large"
        class="auth-form"
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
          class="submit-btn"
          :loading="loading"
          native-type="submit"
          @click="handleAccountLogin"
        >
          登 录
        </el-button>
      </el-form>

      <!-- 手机号登录 -->
      <el-form
        v-else
        ref="phoneFormRef"
        :model="phoneForm"
        :rules="phoneRules"
        size="large"
        class="auth-form"
      >
        <el-form-item prop="phone">
          <el-input
            v-model="phoneForm.phone"
            placeholder="请输入手机号"
            :prefix-icon="Iphone"
            clearable
            maxlength="11"
          />
        </el-form-item>
        <el-form-item prop="code">
          <el-input
            v-model="phoneForm.code"
            placeholder="请输入验证码"
            :prefix-icon="Key"
            clearable
            maxlength="6"
          >
            <template #append>
              <el-button
                :disabled="codeCooldown > 0"
                :loading="codeSending"
                style="min-width: 100px"
                @click="handleSendCode"
              >
                {{ codeCooldown > 0 ? `${codeCooldown}s 后重试` : '获取验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-button
          class="submit-btn"
          :loading="loading"
          @click="handlePhoneLogin"
        >
          登 录
        </el-button>
      </el-form>
    </div>

    <!-- 注册表单（步骤 1：基本账号） -->
    <div v-else>
      <div class="reg-steps">
        <div class="reg-step" :class="{ active: regStep === 1, done: regStep > 1 }">
          <span class="step-num">{{ regStep > 1 ? '✓' : '1' }}</span>
          <span>创建账号</span>
        </div>
        <div class="step-line" />
        <div class="reg-step" :class="{ active: regStep === 2 }">
          <span class="step-num">2</span>
          <span>完善信息</span>
        </div>
      </div>

      <!-- Step1：账号信息 -->
      <el-form
        v-if="regStep === 1"
        ref="reg1FormRef"
        :model="regForm"
        :rules="reg1Rules"
        size="large"
        class="auth-form"
      >
        <el-form-item prop="username">
          <el-input
            v-model="regForm.username"
            placeholder="请输入用户名（3-20 个字符）"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="regForm.password"
            type="password"
            placeholder="请输入密码（至少 6 位）"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="phone">
          <el-input
            v-model="regForm.phone"
            placeholder="请输入手机号（选填）"
            :prefix-icon="Iphone"
            clearable
            maxlength="11"
          />
        </el-form-item>
        <el-button class="submit-btn" @click="goRegStep2">下一步</el-button>
        <div class="form-footer">
          已有账号？<el-link type="danger" @click="activeTab = 'login'">立即登录</el-link>
        </div>
      </el-form>

      <!-- Step2：补充信息 -->
      <el-form
        v-else
        ref="reg2FormRef"
        :model="regForm"
        :rules="reg2Rules"
        size="large"
        class="auth-form"
      >
        <el-form-item prop="email">
          <el-input
            v-model="regForm.email"
            placeholder="请输入邮箱（选填）"
            :prefix-icon="Message"
            clearable
          />
        </el-form-item>
        <div class="reg-actions">
          <el-button size="large" class="back-btn" @click="regStep = 1">上一步</el-button>
          <el-button
            class="submit-btn reg-submit"
            :loading="loading"
            @click="handleRegister"
          >
            完成注册
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { User, Lock, Iphone, Key, Message } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { sendCode, phoneCodeLogin, register } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// ───── Tab 状态 ─────
const activeTab = ref<'login' | 'register'>('login')
const loginMode = ref<'account' | 'phone'>('account')
const regStep = ref(1)

// ───── Loading / 验证码 ─────
const loading = ref(false)
const codeSending = ref(false)
const codeCooldown = ref(0)

// ───── 表单 refs ─────
const accountFormRef = ref<FormInstance>()
const phoneFormRef = ref<FormInstance>()
const reg1FormRef = ref<FormInstance>()
const reg2FormRef = ref<FormInstance>()

// ───── 表单数据 ─────
const accountForm = reactive({ username: '', password: '' })
const phoneForm = reactive({ phone: '', code: '' })
const regForm = reactive({ username: '', password: '', phone: '', email: '' })

// ───── 校验规则 ─────
const accountRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const phoneRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为 6 位数字', trigger: 'blur' },
  ],
}

const reg1Rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名 3-20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码至少 6 位', trigger: 'blur' },
  ],
  phone: [{ pattern: /^(1[3-9]\d{9})?$/, message: '手机号格式不正确', trigger: 'blur' }],
}

const reg2Rules: FormRules = {
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

// ───── 账号密码登录 ─────
async function handleAccountLogin() {
  if (!(await accountFormRef.value?.validate().catch(() => false))) return
  loading.value = true
  try {
    await authStore.login(accountForm)
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}

// ───── 发送验证码 ─────
async function handleSendCode() {
  if (!phoneForm.phone || !/^1[3-9]\d{9}$/.test(phoneForm.phone)) {
    ElMessage.warning('请先输入正确的手机号')
    return
  }
  codeSending.value = true
  try {
    const res = await sendCode(phoneForm.phone)
    // 开发模式：后端返回明文验证码
    if (res.code) {
      phoneForm.code = res.code
      ElMessage.success(`验证码已发送（开发模式：${res.code}）`)
    } else {
      ElMessage.success('验证码已发送，请注意查收')
    }
    startCooldown()
  } catch {
    // request.ts 统一处理错误
  } finally {
    codeSending.value = false
  }
}

function startCooldown() {
  codeCooldown.value = 60
  const timer = setInterval(() => {
    if (--codeCooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

// ───── 手机号验证码登录 ─────
async function handlePhoneLogin() {
  if (!(await phoneFormRef.value?.validate().catch(() => false))) return
  loading.value = true
  try {
    await authStore.phoneLogin(phoneForm)
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } finally {
    loading.value = false
  }
}

// ───── 注册步骤 1 → 2 ─────
async function goRegStep2() {
  if (!(await reg1FormRef.value?.validate().catch(() => false))) return
  regStep.value = 2
}

// ───── 完成注册 ─────
async function handleRegister() {
  if (!(await reg2FormRef.value?.validate().catch(() => false))) return
  loading.value = true
  try {
    await register({
      username: regForm.username,
      password: regForm.password,
      phone: regForm.phone || undefined,
      email: regForm.email || undefined,
    })
    ElMessage.success('注册成功，请登录')
    // 重置注册状态
    Object.assign(regForm, { username: '', password: '', phone: '', email: '' })
    regStep.value = 1
    activeTab.value = 'login'
    accountForm.username = regForm.username
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ===== Tab 导航 ===== */
.tab-nav {
  display: flex;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 28px;
}

.tab-btn {
  flex: 1;
  padding: 12px 0;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  color: #78909c;
  cursor: pointer;
  transition: color 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tab-btn.active {
  color: #d32f2f;
  border-bottom-color: #d32f2f;
}

/* ===== 登录子 Tab ===== */
.login-sub-tabs {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.login-sub-tabs span {
  font-size: 13px;
  color: #90a4ae;
  cursor: pointer;
  padding-bottom: 4px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.login-sub-tabs span.active {
  color: #d32f2f;
  border-bottom-color: #d32f2f;
}

/* ===== 表单 ===== */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Input 聚焦时红色边框 */
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #d32f2f inset !important;
}

/* ===== 提交按钮 ===== */
.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px !important;
  border: none;
  background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
  box-shadow: 0 4px 16px rgba(211, 47, 47, 0.4);
}

/* ===== 注册步骤 ===== */
.reg-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.reg-step {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #90a4ae;
  font-size: 13px;
}

.reg-step.active { color: #d32f2f; }
.reg-step.done { color: #4caf50; }

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.reg-step.active .step-num { background: #d32f2f; color: #fff; }
.reg-step.done .step-num { background: #4caf50; color: #fff; }

.step-line {
  flex: 1;
  max-width: 40px;
  height: 2px;
  background: #e0e0e0;
}

/* ===== 注册双按钮 ===== */
.reg-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.back-btn {
  flex: 1;
  height: 48px;
  border-radius: 10px !important;
  border-color: #d32f2f;
  color: #d32f2f;
}

.back-btn:hover { background: #ffebee; }

.reg-submit {
  flex: 2;
  margin-top: 0;
}

/* ===== 底部链接 ===== */
.form-footer {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #78909c;
}
</style>
