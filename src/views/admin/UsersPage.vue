<template>
  <div class="page-skeleton">
    <div class="page-header"><h2>用户管理</h2></div>
    <el-card shadow="never"><el-empty description="用户管理功能开发中..." :image-size="80" /></el-card>
  </div>
</template>
<script setup lang="ts">
import { useAppStore } from '@/stores/app'
useAppStore().setPageTitle('用户管理')
</script>
<style scoped>.page-skeleton{display:flex;flex-direction:column;gap:16px;}.page-header h2{margin:0;font-size:20px;font-weight:700;}</style>
