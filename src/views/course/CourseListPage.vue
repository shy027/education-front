<template>
  <div class="page-skeleton">
    <div class="page-header">
      <h2>课程列表</h2>
    </div>
    <el-card shadow="never" class="content-card">
      <el-empty description="课程功能开发中..." :image-size="120" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
useAppStore().setPageTitle('课程')
</script>

<style scoped>
.page-skeleton { display: flex; flex-direction: column; gap: 16px; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 700; }
.content-card { border-radius: 12px; min-height: 400px; display: flex; align-items: center; justify-content: center; }
</style>
