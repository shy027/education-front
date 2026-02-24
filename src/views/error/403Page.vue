<template>
  <div class="error-page">
    <div class="error-code">403</div>
    <h2 class="error-title">抱歉，您没有访问权限</h2>
    <p class="error-desc">您的账号角色无法访问此页面，请联系管理员</p>
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
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.error-title { font-size: 24px; margin: 16px 0 8px; color: var(--el-text-color-primary); }
.error-desc { color: var(--el-text-color-secondary); margin-bottom: 32px; }
.error-actions { display: flex; gap: 12px; }
</style>
