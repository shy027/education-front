<template>
  <div class="page-skeleton">
    <el-page-header @back="$router.back()"><template #content>话题详情</template></el-page-header>
    <el-card shadow="never"><el-empty description="话题详情开发中..." :image-size="80" /></el-card>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>.page-skeleton{display:flex;flex-direction:column;gap:16px;}</style>
