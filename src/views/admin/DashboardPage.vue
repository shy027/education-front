<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2 class="page-title">数据看板</h2>
      <p class="page-desc">平台整体运营数据概览（功能开发中）</p>
    </div>
    <div class="placeholder-cards">
      <div class="ph-card" v-for="item in placeholders" :key="item.label">
        <div class="ph-icon" :style="{ background: item.bg }">
          <el-icon :size="24" :color="item.color"><component :is="item.icon" /></el-icon>
        </div>
        <div class="ph-num">{{ item.value }}</div>
        <div class="ph-label">{{ item.label }}</div>
      </div>
    </div>
    <el-card class="coming-soon" shadow="never">
      <el-empty description="数据看板功能正在建设中，敬请期待" :image-size="120">
        <el-button @click="$router.push('/admin/users')">前往用户管理</el-button>
        <el-button type="primary" @click="$router.push('/admin/audit')" class="red-btn">前往审核中心</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { UserFilled, Reading, FolderOpened, CircleCheckFilled } from '@element-plus/icons-vue'

const placeholders = ref([
  { label: '注册用户', value: '—', icon: markRaw(UserFilled), color: '#d32f2f', bg: '#ffebee' },
  { label: '课程总数', value: '—', icon: markRaw(Reading), color: '#1976d2', bg: '#e3f2fd' },
  { label: '资源数量', value: '—', icon: markRaw(FolderOpened), color: '#388e3c', bg: '#e8f5e9' },
  { label: '待审核', value: '—', icon: markRaw(CircleCheckFilled), color: '#f57c00', bg: '#fff3e0' },
])
</script>

<style scoped>
.dashboard-page { display: flex; flex-direction: column; gap: 20px; }
.page-header { }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }
.placeholder-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.ph-card { background: #fff; border-radius: 14px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.ph-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.ph-num  { font-size: 28px; font-weight: 800; color: #263238; }
.ph-label{ font-size: 13px; color: #78909c; }
.coming-soon { border-radius: 16px !important; }
.red-btn { background: linear-gradient(135deg, #ff5252, #d32f2f) !important; border: none !important; color: #fff !important; border-radius: 8px !important; }
</style>
