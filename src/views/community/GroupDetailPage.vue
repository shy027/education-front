<template>
  <div class="page-skeleton">
    <el-page-header @back="$router.back()"><template #content>小组详情</template></el-page-header>
    <el-card shadow="never"><el-empty description="小组功能开发中..." :image-size="80" /></el-card>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>.page-skeleton{display:flex;flex-direction:column;gap:16px;}</style>
