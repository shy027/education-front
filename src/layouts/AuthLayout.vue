<template>
  <div class="auth-page">
    <!-- 左侧品牌区 -->
    <div class="brand-panel">
      <div class="brand-top">
        <div class="brand-logo">
          <el-icon size="28" color="#fff"><Reading /></el-icon>
        </div>
        <span class="brand-name">课程思政融合育人平台</span>
      </div>

      <div class="brand-slogan">
        <h2>立德树人 · 铸魂育人</h2>
        <p>为教师提供课程思政建设全流程支持，实现资源整合、教学创新与成效评估一体化</p>
      </div>

      <ul class="brand-features">
        <li v-for="f in features" :key="f">
          <el-icon><CircleCheckFilled /></el-icon>
          <span>{{ f }}</span>
        </li>
      </ul>

      <div class="brand-footer">
        <el-icon><CircleCheckFilled /></el-icon>
        <span>数据加密存储 · 安全认证 · 隐私保护</span>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="form-panel">
      <div class="form-inner">
        <router-view />
      </div>
      <p class="copyright">© 2026 课程思政融合育人平台 v1.0 | 立德树人 · 铸魂育人</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Reading, CircleCheckFilled } from '@element-plus/icons-vue'

const features = [
  '智能案例库与思政元素精准匹配',
  '任务式学习与价值观研讨融合',
  '五维度价值观成长雷达图',
  '一键生成课程思政教学报告',
]
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  background: #eceff1;
}

/* ===== 左侧品牌面板 ===== */
.brand-panel {
  width: 42%;
  background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #ff5252 100%);
  color: #fff;
  padding: 48px 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  overflow: hidden;
}

/* 装饰圆 */
.brand-panel::before {
  content: '';
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  top: -80px;
  right: -80px;
}
.brand-panel::after {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  bottom: -60px;
  left: 40px;
}

.brand-top {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.brand-logo {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.brand-slogan {
  position: relative;
  z-index: 1;
  flex: 1;
}

.brand-slogan h2 {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 12px;
  line-height: 1.3;
  letter-spacing: 1px;
}

.brand-slogan p {
  font-size: 15px;
  margin: 0;
  opacity: 0.88;
  line-height: 1.7;
}

.brand-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.brand-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  opacity: 0.92;
}

.brand-features .el-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.brand-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.7;
  position: relative;
  z-index: 1;
}

/* ===== 右侧表单面板 ===== */
.form-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 20px;
}

.form-inner {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.copyright {
  font-size: 12px;
  color: #90a4ae;
  margin: 0;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .auth-page { flex-direction: column; }
  .brand-panel { width: 100%; padding: 28px 24px; }
  .brand-features, .brand-slogan p { display: none; }
  .form-inner { padding: 28px 20px; }
}
</style>
