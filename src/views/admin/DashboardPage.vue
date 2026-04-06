<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2 class="page-title">数据看板</h2>
      <p class="page-desc">平台整体运营数据实时概览</p>
    </div>

    <!-- 顶层指标卡片 -->
    <div class="stats-cards">
      <div class="stat-card" v-for="item in statsConfig" :key="item.label">
        <div class="stat-icon" :style="{ background: item.bg }">
          <el-icon :size="24" :color="item.color"><component :is="item.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-num">{{ stats[item.key] ?? '—' }}</div>
          <div class="stat-label">{{ item.label }}</div>
          <div v-if="item.subLabel" class="stat-sub">
            {{ item.subLabel }}: <span class="trend-up">+{{ stats[item.subKey] ?? 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>资源类型分布</span>
            <el-tag size="small" type="info">实时</el-tag>
          </div>
        </template>
        <div ref="resourceChartRef" class="chart-container"></div>
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>学科课程规模</span>
            <el-tag size="small" type="info">按学科</el-tag>
          </div>
        </template>
        <div ref="courseChartRef" class="chart-container"></div>
      </el-card>
    </div>

    <!-- 底部通知 -->
    <el-card class="operation-card" shadow="never" v-if="stats.pendingAudits > 0 && authStore.isAdmin">
      <div class="audit-notice">
        <el-alert
          :title="`当前有 ${stats.pendingAudits} 项待审核内容，请及时处理。`"
          type="warning"
          show-icon
          :closable="false"
        >
          <template #default>
            <el-button link type="warning" @click="$router.push('/admin/audit')" style="margin-left: 10px">立即前往</el-button>
          </template>
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, markRaw, nextTick } from 'vue'
import { UserFilled, Reading, FolderOpened, CircleCheckFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDashboardStats, type DashboardStats } from '@/api/report'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const stats = ref<Partial<DashboardStats>>({
  totalUsers: 0,
  totalCourses: 0,
  totalResources: 0,
  pendingAudits: 0,
  todayGrowth: 0,
  processedToday: 0
})

const statsConfig = [
  { label: '注册用户', key: 'totalUsers', subLabel: '今日新增', subKey: 'todayGrowth', icon: markRaw(UserFilled), color: '#d32f2f', bg: '#ffebee' },
  { label: '课程总数', key: 'totalCourses', icon: markRaw(Reading), color: '#1976d2', bg: '#e3f2fd' },
  { label: '资源数量', key: 'totalResources', icon: markRaw(FolderOpened), color: '#388e3c', bg: '#e8f5e9' },
  { label: '待审核项', key: 'pendingAudits', subLabel: '今日已办', subKey: 'processedToday', icon: markRaw(CircleCheckFilled), color: '#f57c00', bg: '#fff3e0' },
]

const resourceChartRef = ref<HTMLElement>()
const courseChartRef = ref<HTMLElement>()
let resourceChart: echarts.ECharts | null = null
let courseChart: echarts.ECharts | null = null

const initCharts = () => {
  if (resourceChartRef.value) {
    resourceChart = echarts.init(resourceChartRef.value)
  }
  if (courseChartRef.value) {
    courseChart = echarts.init(courseChartRef.value)
  }
}

const updateCharts = (data: DashboardStats) => {
  // 资源分布饼图
  const resourceData = Object.entries(data.typeDistribution || {}).map(([name, value]) => ({ name, value }))
  resourceChart?.setOption({
    tooltip: { 
      trigger: 'item', 
      formatter: '{b}: <b style="color:#d32f2f">{c}</b> ({d}%)',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#333' }
    },
    legend: { 
      type: 'scroll',
      bottom: '2%', 
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#909399', fontSize: 12 }
    },
    color: ['#ff5252', '#409eff', '#67c23a', '#e6a23c', '#909399'],
    series: [{
      name: '资源分布',
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { 
        borderRadius: 8, 
        borderColor: '#fff', 
        borderWidth: 2 
      },
      label: { show: false },
      emphasis: { 
        scale: true,
        scaleSize: 10,
        label: { 
          show: true, 
          fontSize: '16', 
          fontWeight: 'bold',
          formatter: '{b}\n{d}%' 
        } 
      },
      data: resourceData
    }]
  })

  // 学科课程柱状图
  const subjectNames = Object.keys(data.subjectDistribution || {})
  const subjectValues = Object.values(data.subjectDistribution || {})
  
  // 动态计算是否需要滚动条
  const showDataZoom = subjectNames.length > 8

  courseChart?.setOption({
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#333' }
    },
    grid: { 
      top: '12%',
      left: '5%', 
      right: '5%', 
      bottom: showDataZoom ? '18%' : '12%', 
      containLabel: true 
    },
    xAxis: { 
      type: 'category', 
      data: subjectNames, 
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { 
        interval: 0, 
        rotate: subjectNames.length > 5 ? 35 : 0,
        color: '#909399',
        fontSize: 11,
        overflow: 'truncate',
        width: 80
      }
    },
    yAxis: { 
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { type: 'dashed', color: '#f5f5f5' } },
      axisLabel: { color: '#909399' }
    },
    dataZoom: showDataZoom ? [{
      type: 'slider',
      show: true,
      xAxisIndex: [0],
      start: 0,
      end: (8 / subjectNames.length) * 100, // 默认显示前 8 个
      height: 18,
      bottom: '2%',
      borderColor: 'transparent',
      backgroundColor: '#f8f9fa',
      fillerColor: 'rgba(64, 158, 255, 0.2)',
      handleIcon: 'path://M512,512m-448,0a448,448,0,1,1,896,0a448,448,0,1,1,-896,0Z',
      handleSize: '100%',
      showDetail: false
    }] : [],
    series: [{
      name: '课程数量',
      type: 'bar',
      barWidth: '35%',
      showBackground: true,
      backgroundStyle: { color: '#fbfcff', borderRadius: 6 },
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#66b1ff' },
          { offset: 1, color: '#409eff' }
        ])
      },
      emphasis: {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#337ecc' }
          ])
        }
      },
      data: subjectValues
    }]
  })
}

const fetchData = async () => {
  try {
    const res = await getDashboardStats()
    if (res) {
      stats.value = res
      await nextTick()
      updateCharts(res)
    }
  } catch (e) {
    console.error('获取看板数据失败', e)
  }
}

const handleResize = () => {
  resourceChart?.resize()
  courseChart?.resize()
}

onMounted(() => {
  initCharts()
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  resourceChart?.dispose()
  courseChart?.dispose()
})
</script>

<style scoped>
.dashboard-page { display: flex; flex-direction: column; gap: 20px; padding: 20px; background: #f5f7f9; min-height: calc(100vh - 120px); }
.page-header { margin-bottom: 10px; }
.page-title { margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px; }
.page-desc  { margin: 0; font-size: 14px; color: #606266; }

.stats-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.stat-card { background: #fff; border-radius: 16px; padding: 24px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: transform 0.3s ease; }
.stat-card:hover { transform: translateY(-4px); }
.stat-icon { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-content { flex: 1; }
.stat-num  { font-size: 32px; font-weight: 800; color: #1a1a1a; line-height: 1.2; margin-bottom: 4px; }
.stat-label{ font-size: 14px; color: #909399; font-weight: 500; }
.stat-sub { font-size: 12px; color: #909399; margin-top: 4px; }
.trend-up { color: #f56c6c; font-weight: 700; }

.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.chart-card { border-radius: 16px !important; border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: #303133; }
.chart-container { height: 320px; width: 100%; }

.operation-card { border-radius: 16px !important; border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important; }

:deep(.el-card__header) { border-bottom: 1px solid #f0f0f0; padding: 18px 24px; }
:deep(.el-alert) { border-radius: 12px; }
</style>
