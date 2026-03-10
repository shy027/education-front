<template>
  <div class="school-detail-page">
    <!-- 返回 -->
    <el-page-header @back="$router.back()" style="margin-bottom: 24px">
      <template #content>
        <span style="font-weight: 700; font-size: 16px">{{ school?.schoolName ?? '学校详情' }}</span>
      </template>
    </el-page-header>

    <div v-if="loading" v-loading="true" style="min-height: 300px" />

    <template v-else-if="school">
      <!-- Hero 区域 -->
      <div class="hero-card">
        <!-- Logo -->
        <div class="hero-logo">
          <img
            v-if="school.logoUrl"
            :src="school.logoUrl"
            :alt="school.schoolName"
            class="logo-img"
          />
          <div v-else class="logo-placeholder">
            <el-icon :size="48" color="#d32f2f"><OfficeBuilding /></el-icon>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="hero-info">
          <h1 class="school-name">{{ school.schoolName }}</h1>
          <div class="school-tags">
            <el-tag v-if="school.province" class="tag">{{ school.province }}</el-tag>
            <el-tag v-if="school.city" class="tag" type="info">{{ school.city }}</el-tag>
            <el-tag v-if="school.schoolCode" class="tag" type="warning">{{ school.schoolCode }}</el-tag>
          </div>
          <p v-if="school.description" class="school-desc">{{ school.description }}</p>
          <div v-if="school.address" class="school-address">
            <el-icon><Location /></el-icon>
            {{ school.address }}
          </div>
        </div>

        <!-- 操作 -->
        <div class="hero-action">
          <!-- 已加入 -->
          <el-tag
            v-if="isJoined"
            type="success"
            size="large"
            class="joined-tag"
          >
            <el-icon><Check /></el-icon>
            已加入该学校
          </el-tag>

          <!-- 可申请加入（教师且无学校） -->
          <el-button
            v-else-if="canJoin"
            type="primary"
            size="large"
            class="join-btn"
            :loading="joining"
            @click="joinDialogVisible = true"
          >申请加入</el-button>
        </div>
      </div>

      <!-- 统计卡片区 -->
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-num">{{ school.teacherCount ?? '—' }}</div>
          <div class="stat-label">教师人数</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ school.studentCount ?? '—' }}</div>
          <div class="stat-label">学生人数</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ school.courseCount ?? '—' }}</div>
          <div class="stat-label">开课数量</div>
        </div>
      </div>
    </template>

    <el-empty v-else description="学校不存在" :image-size="120" />

    <!-- 申请加入对话框 -->
    <el-dialog
      v-model="joinDialogVisible"
      :title="`申请加入 ${school?.schoolName}`"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="join-tip">
        <el-icon color="#f57c00" :size="18"><Warning /></el-icon>
        若该学校设置了邀请码，需填写正确方可加入。
      </div>
      <el-form label-width="80px" style="margin-top: 16px">
        <el-form-item label="邀请码">
          <el-input v-model="inviteCode" placeholder="（选填）无邀请码可留空" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="joinDialogVisible = false">取消</el-button>
        <el-button type="primary" class="red-btn" :loading="joining" @click="handleJoin">确认申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { OfficeBuilding, Location, Check, Warning } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getSchoolDetail, joinSchool } from '@/api/school'
import type { SchoolItem } from '@/api/school'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const schoolId = route.params.id as string
const loading = ref(false)
const school = ref<SchoolItem | null>(null)

async function fetchDetail() {
  loading.value = true
  try {
    school.value = await getSchoolDetail(schoolId)
  } catch {
    school.value = null
  } finally {
    loading.value = false
  }
}

/** 是否已加入该学校（统一转字符串比较） */
const isJoined = computed(() =>
  !!authStore.userInfo?.schoolId &&
  String(authStore.userInfo.schoolId) === String(school.value?.schoolId)
)

/** 仅教师且无学校时可申请 */
const canJoin = computed(() => authStore.isTeacher && !authStore.hasSchool)

// ── 申请加入 ──
const joinDialogVisible = ref(false)
const inviteCode = ref('')
const joining = ref(false)

async function handleJoin() {
  if (!school.value) return
  joining.value = true
  try {
    await joinSchool(String(school.value.schoolId), {
      inviteCode: inviteCode.value || undefined,
    })
    ElMessage.success(`成功加入 ${school.value.schoolName}！`)
    joinDialogVisible.value = false
    await authStore.fetchCurrentUser()
    router.back()
  } catch {
    // 错误由 request 拦截器统一弹出
  } finally {
    joining.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped>
.school-detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== Hero ===== */
.hero-card {
  background: #fff;
  border-radius: 20px;
  padding: 32px;
  display: flex;
  gap: 28px;
  align-items: flex-start;
  box-shadow: 0 4px 20px rgba(0,0,0,0.07);
}

.hero-logo {
  flex-shrink: 0;
}

.logo-img {
  width: 96px;
  height: 96px;
  border-radius: 18px;
  object-fit: cover;
  border: 2px solid #f5f5f5;
}

.logo-placeholder {
  width: 96px;
  height: 96px;
  border-radius: 18px;
  background: #ffebee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.school-name {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 800;
  color: #263238;
}

.school-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag { border-radius: 6px; }

.school-desc {
  margin: 0 0 10px;
  font-size: 14px;
  color: #546e7a;
  line-height: 1.6;
}

.school-address {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #78909c;
}

.hero-action {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
}

.joined-tag {
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.join-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
  padding: 12px 24px !important;
}

/* ===== 统计卡片 ===== */
.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.stat-num {
  font-size: 36px;
  font-weight: 800;
  color: #d32f2f;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: #78909c;
}

/* ===== 对话框 ===== */
.join-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff8e1;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: #795548;
  border: 1px solid #ffe082;
}

.red-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 8px !important;
  color: #fff !important;
}
</style>
