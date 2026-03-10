<template>
  <div class="schools-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">院校中心</h2>
        <p class="page-desc">浏览平台接入院校，教师可申请加入所在学校</p>
      </div>
      <!-- 已有学校时展示徽章 -->
      <div v-if="authStore.hasSchool" class="school-badge">
        <el-icon><OfficeBuilding /></el-icon>
        <span>{{ authStore.userInfo?.schoolName }}</span>
      </div>
    </div>

    <!-- 已加入提示条 -->
    <el-alert
      v-if="authStore.isTeacher && authStore.hasSchool"
      type="success"
      :closable="false"
      class="joined-alert"
    >
      <template #title>
        您已加入 <strong>{{ authStore.userInfo?.schoolName }}</strong>，无需重复申请。
      </template>
    </el-alert>

    <!-- 待加入提示条 -->
    <el-alert
      v-if="authStore.isTeacher && !authStore.hasSchool"
      type="warning"
      :closable="false"
      class="joined-alert"
    >
      <template #title>
        您尚未加入任何学校，请在下方找到您的学校并点击「查看详情」后申请加入。
      </template>
    </el-alert>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索学校名称..."
        :prefix-icon="Search"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-input
        v-model="province"
        placeholder="省份（如：江苏）"
        clearable
        style="width: 160px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-button type="primary" class="red-btn" @click="handleSearch">搜索</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <!-- 学校卡片列表 -->
    <div v-loading="loading" class="school-grid">
      <el-empty
        v-if="!loading && schools.length === 0"
        description="暂无符合条件的学校"
        :image-size="120"
      />

      <div
        v-for="school in schools"
        :key="school.schoolId"
        class="school-card"
        @click="goDetail(school)"
      >
        <!-- Logo / 占位图标 -->
        <div class="school-icon">
          <img
            v-if="school.logoUrl"
            :src="school.logoUrl"
            :alt="school.schoolName"
            class="school-logo-img"
          />
          <el-icon v-else :size="32" color="#d32f2f"><OfficeBuilding /></el-icon>
        </div>

        <!-- 学校信息 -->
        <div class="school-info">
          <div class="school-name">{{ school.schoolName }}</div>
          <div class="school-meta">
            <span v-if="school.province || school.city" class="meta-item">
              <el-icon><Location /></el-icon>
              {{ [school.province, school.city].filter(Boolean).join(' · ') }}
            </span>
            <span v-if="school.teacherCount !== undefined" class="meta-item">
              <el-icon><User /></el-icon>
              {{ school.teacherCount }} 位教师
            </span>
          </div>
          <div v-if="school.description" class="school-address">{{ school.description }}</div>
          <div v-else-if="school.address" class="school-address">{{ school.address }}</div>
        </div>

        <!-- 状态标签 -->
        <div class="school-actions" @click.stop>
          <el-tag
            v-if="isMySchool(school)"
            type="success"
            size="small"
          >已加入</el-tag>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        background
        @current-change="fetchSchools"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, OfficeBuilding, Location, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getSchoolList } from '@/api/school'
import type { SchoolItem } from '@/api/school'

const authStore = useAuthStore()
const router = useRouter()

// ───── 搜索 ─────
const keyword  = ref('')
const province = ref('')
const pageNum  = ref(1)
const pageSize = 12

// ───── 数据 ─────
const loading = ref(false)
const schools = ref<SchoolItem[]>([])
const total   = ref(0)

/** 是否是当前用户所属学校（统一转字符串比较，兼容 Long 与 string） */
function isMySchool(school: SchoolItem): boolean {
  if (!authStore.userInfo?.schoolId) return false
  return String(authStore.userInfo.schoolId) === String(school.schoolId)
}

/**
 * 省份搜索前端模糊处理：
 * 后端用精确匹配，这里自动尝试补"省"/"市"后缀搜索多次后端返回并合并去重
 * 简化方案：将用户输入智能规范化（去掉省市后缀后再加回去做精确匹配候选列表）
 */
function normalizeProvince(input: string): string[] {
  if (!input) return []
  const trimmed = input.trim().replace(/[省市区]$/, '') // 去掉末尾省/市/区
  return [trimmed + '省', trimmed + '市', trimmed, input.trim()]
}

async function fetchSchools() {
  loading.value = true
  try {
    const provinceVariants = normalizeProvince(province.value)
    // 如果未填省份，直接请求
    if (!province.value.trim()) {
      const res = await getSchoolList({
        keyword: keyword.value || undefined,
        pageNum: pageNum.value,
        pageSize,
      })
      schools.value = res?.list ?? []
      total.value = res?.total ?? 0
      return
    }
    // 依次尝试省份后缀变体，返回第一个有结果的
    for (const p of provinceVariants) {
      const res = await getSchoolList({
        keyword: keyword.value || undefined,
        province: p,
        pageNum: pageNum.value,
        pageSize,
      })
      if ((res?.list?.length ?? 0) > 0) {
        schools.value = res.list
        total.value = res.total
        return
      }
    }
    // 所有变体都没结果
    schools.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  fetchSchools()
}

function resetSearch() {
  keyword.value = ''
  province.value = ''
  handleSearch()
}

function goDetail(school: SchoolItem) {
  router.push(`/schools/${school.schoolId}`)
}

onMounted(fetchSchools)
</script>

<style scoped>
.schools-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== 页头 ===== */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.school-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #e8f5e9;
  color: #2e7d32;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  border: 1.5px solid #a5d6a7;
}

.joined-alert { border-radius: 10px !important; }

/* ===== 搜索栏 ===== */
.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #fff;
  padding: 16px 20px;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
.search-input { width: 280px; }

/* ===== 学校卡片 ===== */
.school-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.school-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.25s;
}
.school-card:hover {
  border-color: #ffcdd2;
  box-shadow: 0 6px 20px rgba(211,47,47,0.1);
  transform: translateY(-2px);
}

/* Logo 区域 */
.school-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #ffebee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.school-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.school-info { flex: 1; min-width: 0; }

.school-name {
  font-size: 16px;
  font-weight: 700;
  color: #263238;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #78909c;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.school-address {
  margin-top: 6px;
  font-size: 12px;
  color: #90a4ae;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

/* ===== 分页 ===== */
.pagination-wrap {
  display: flex;
  justify-content: center;
}

/* ===== 公共按钮 ===== */
.red-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 8px !important;
  color: #fff !important;
}
</style>
