<template>
  <el-container class="front-layout">
    <!-- 顶部导航栏 -->
    <TopHeader />

    <!-- 主体内容区居中分布 -->
    <el-main class="front-main">
      <div class="content-container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" class="page-wrapper" />
          </transition>
        </router-view>
      </div>
    </el-main>
    
    <!-- 全局页面返回顶部 -->
    <el-backtop :right="40" :bottom="40" />
  </el-container>
</template>

<script setup lang="ts">
import TopHeader from '@/components/layout/TopHeader.vue'
</script>

<style scoped>
.front-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-page, #f5f7fa);
}

.front-main {
  flex: 1;
  padding: 24px 20px;
  display: flex;
  justify-content: center;
  overflow-x: hidden;
}

.content-container {
  width: 100%;
  max-width: 1200px; /* 控制前台内容区域最大宽度 = 居中 */
  margin: 0 auto;
  box-sizing: border-box;
}

.page-wrapper {
  min-height: calc(100vh - 60px - 48px); /* 视口高度 - header - padding */
  background: transparent;
  width: 100%;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
