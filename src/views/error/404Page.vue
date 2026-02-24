<template>
  <div class="error-page">
    <div class="error-code">404</div>
    <h2 class="error-title">页面不存在</h2>
    <p class="error-desc">您访问的页面已被移除或不存在，请检查地址是否正确</p>
    <div class="error-actions">
      <el-button type="primary" @click="$router.push('/home')">返回首页</el-button>
      <el-button @click="$router.back()">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.error-page {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: calc(100vh - 56px); text-align: center; padding: 40px;
}
.error-code {
  font-size: 120px; font-weight: 900; line-height: 1;
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.error-title { font-size: 24px; margin: 16px 0 8px; color: var(--el-text-color-primary); }
.error-desc { color: var(--el-text-color-secondary); margin-bottom: 32px; }
.error-actions { display: flex; gap: 12px; }
</style>
