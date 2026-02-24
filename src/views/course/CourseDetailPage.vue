<template>
  <div class="page-skeleton">
    <el-page-header @back="$router.back()">
      <template #content>课程详情</template>
    </el-page-header>
    <el-card shadow="never" class="content-card">
      <el-empty description="课程详情功能开发中..." :image-size="120" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.page-skeleton { display: flex; flex-direction: column; gap: 16px; }
.content-card { border-radius: 12px; min-height: 400px; }
</style>
