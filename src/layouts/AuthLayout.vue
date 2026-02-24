<template>
  <div class="auth-layout">
    <div class="auth-bg">
      <!-- 背景装饰圆 -->
      <div class="bg-orb orb-1"></div>
      <div class="bg-orb orb-2"></div>
      <div class="bg-orb orb-3"></div>
    </div>

    <div class="auth-container">
      <!-- Logo 区域 -->
      <div class="auth-logo">
        <div class="logo-icon">
          <el-icon size="32" color="#fff"><Reading /></el-icon>
        </div>
        <div class="logo-text">
          <h1>课程思政融合育人平台</h1>
          <p>立德树人 · 育人为本</p>
        </div>
      </div>

      <!-- 登录卡片 -->
      <div class="auth-card">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Reading } from '@element-plus/icons-vue'
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1f4b 0%, #2d3561 40%, #1b4b8a 100%);
  position: relative;
  overflow: hidden;
}

.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.3;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: #4f8ef7;
  top: -100px;
  left: -100px;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: #a855f7;
  bottom: -80px;
  right: 10%;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: #06b6d4;
  top: 40%;
  right: 30%;
}

.auth-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
  max-width: 440px;
  padding: 0 20px;
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
}

.logo-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.logo-text h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  line-height: 1.2;
}

.logo-text p {
  font-size: 13px;
  margin: 0;
  opacity: 0.7;
  letter-spacing: 2px;
}

.auth-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
}
</style>
