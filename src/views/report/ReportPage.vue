<template>
  <div class="report-page">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ authStore.isTeacher ? '教学报告' : '素养报告' }}</h2>
        <p class="page-desc">{{ authStore.isTeacher ? '查看课程思政教学效果分析与报告' : '了解您的价值观成长历程与五维素养评估' }}</p>
      </div>
      <!-- 课程选择 -->
      <el-select v-model="selectedCourseId" placeholder="请选择课程" style="width:220px" @change="onCourseChange">
        <el-option v-for="c in myCourseOptions" :key="c.id" :label="c.courseName" :value="c.id" />
      </el-select>
    </div>

    <div v-if="!selectedCourseId" class="empty-tip">
      <el-empty description="请先选择一门课程查看报告" :image-size="120">
        <el-button type="primary" class="red-btn" @click="$router.push('/course')">去选择课程</el-button>
      </el-empty>
    </div>

    <div v-else v-loading="loading" class="report-content">
      <!-- 统计卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon red"><el-icon :size="22"><DataAnalysis /></el-icon></div>
          <div>
            <div class="stat-num">{{ stats?.totalWatchDuration ? Math.floor(stats.totalWatchDuration / 60) + ' min' : '—' }}</div>
            <div class="stat-label">学习时长</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><el-icon :size="22"><Comment /></el-icon></div>
          <div>
            <div class="stat-num">{{ stats?.totalPosts ?? '—' }}</div>
            <div class="stat-label">参与讨论</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><el-icon :size="22"><Finished /></el-icon></div>
          <div>
            <div class="stat-num">{{ stats?.totalAnswers ?? '—' }}</div>
            <div class="stat-label">完成作业</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow"><el-icon :size="22"><Trophy /></el-icon></div>
          <div>
            <div class="stat-num">{{ profile?.totalScore?.toFixed(1) ?? '—' }}</div>
            <div class="stat-label">综合得分</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><el-icon :size="22"><Medal /></el-icon></div>
          <div>
            <div class="stat-num">{{ profile?.level ?? '—' }}</div>
            <div class="stat-label">综合等级</div>
          </div>
        </div>
      </div>

      <!-- 雷达图 + 维度分析 -->
      <div class="section-row">
        <div class="section-card radar-card">
          <div class="card-header">
            <h3>五维素养雷达图</h3>
            <el-button size="small" @click="calculateProfile" :loading="calculating">更新评估</el-button>
          </div>
          <div ref="radarChartRef" class="radar-chart" />
        </div>

        <div class="section-card dimension-card">
          <div class="card-header"><h3>维度详情</h3></div>
          <div class="dimension-list">
            <div
              v-for="(d, idx) in dimensions"
              :key="d.name"
              class="dimension-item"
            >
              <div class="dimension-header">
                <span class="dimension-dot" :style="{ background: RADAR_COLORS[idx] }" />
                <span class="dimension-name">{{ d.name }}</span>
                <span class="dimension-score">{{ d.score }}%</span>
              </div>
              <el-progress
                :percentage="d.score"
                :stroke-width="6"
                :show-text="false"
                :color="RADAR_COLORS[idx]"
              />
              <div class="dimension-desc">{{ d.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成长折线图 -->
      <div class="section-card">
        <div class="card-header">
          <h3>素养成长轨迹（近 30 天）</h3>
          <el-button size="small" class="red-sm-btn" @click="fetchGrowthTrack">刷新</el-button>
        </div>
        <div ref="lineChartRef" class="line-chart" />
      </div>

      <!-- 教师端：报告生成 -->
      <div v-if="authStore.isTeacher" class="section-card">
        <div class="card-header">
          <h3>生成课程报告</h3>
          <el-button type="primary" class="red-btn" :loading="generating" @click="handleGenerateReport">
            生成报告
          </el-button>
        </div>
        <el-table :data="reports" stripe style="width:100%">
          <el-table-column label="报告ID" prop="id" width="200" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="reportStatusType(row.status)" size="small">{{ reportStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="生成时间" prop="createdTime" width="150">
            <template #default="{ row }">{{ row.createdTime?.slice(0, 16) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 2"
                text
                type="primary"
                size="small"
                @click="handleDownloadReport(row.id)"
              >
                下载
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { useAuthStore } from '@/stores/auth'
import { getMyCourses } from '@/api/course'
import type { CourseItem } from '@/api/course'
import {
  getMyProfile, getRadarData, getGrowthTrack, getLearningStatistics,
  calculateMyProfile, generateCourseReport, getCourseReportList, getReportDownloadUrl,
} from '@/api/report'
import type { ProfileResponse, StatisticsResponse, ReportDTO } from '@/api/report'
import { ElMessage } from 'element-plus'
import {
  DataAnalysis, Comment, Finished, Trophy, Medal,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()

const RADAR_COLORS = ['#d32f2f', '#f57c00', '#388e3c', '#1976d2', '#7b1fa2']

// ───── 课程选择 ─────
const selectedCourseId = ref('')
const myCourseOptions = ref<CourseItem[]>([])
const loading = ref(false)

async function fetchMyCourses() {
  const res = await getMyCourses()
  myCourseOptions.value = authStore.isTeacher
    ? (res.teachingCourses ?? [])
    : (res.joinedCourses ?? [])
  if (myCourseOptions.value.length) {
    selectedCourseId.value = myCourseOptions.value[0].id
    onCourseChange()
  }
}

async function onCourseChange() {
  if (!selectedCourseId.value) return
  loading.value = true
  try {
    await Promise.all([
      fetchProfile(),
      fetchStatistics(),
      fetchGrowthTrack(),
      authStore.isTeacher ? fetchReports() : Promise.resolve(),
    ])
  } finally {
    loading.value = false
    await nextTick()
    initRadarChart()
    initLineChart()
  }
}

// ───── 画像数据 ─────
const profile = ref<ProfileResponse | null>(null)
const stats = ref<StatisticsResponse | null>(null)
const calculating = ref(false)

const DIMENSION_KEYS = ['theoreticalLiteracy', 'practicalAbility', 'valueIdentity', 'innovativeThinking', 'socialResponsibility']
const DIMENSION_NAMES = ['理论素养', '实践能力', '价值认同', '创新思维', '社会责任感']
const DIMENSION_DESCS = [
  '课程理论学习深度与广度',
  '实践任务参与及完成情况',
  '价值观认同与思政认识',
  '创新思维培养与发散能力',
  '社会责任感与公民意识',
]

const dimensions = computed(() =>
  DIMENSION_KEYS.map((k, i) => ({
    name: DIMENSION_NAMES[i],
    score: Math.round(((profile.value?.[k as keyof ProfileResponse] as number) ?? 0) * 100) / 100,
    desc: DIMENSION_DESCS[i],
  })),
)

async function fetchProfile() {
  try {
    profile.value = await getMyProfile(selectedCourseId.value)
  } catch { profile.value = null }
}

async function fetchStatistics() {
  try {
    stats.value = await getLearningStatistics(selectedCourseId.value)
  } catch { stats.value = null }
}

async function calculateProfileFn() {
  calculating.value = true
  try {
    await calculateMyProfile(selectedCourseId.value)
    await fetchProfile()
    ElMessage.success('评估已更新')
    initRadarChart()
  } finally { calculating.value = false }
}
const calculateProfile = calculateProfileFn

// ───── 雷达图 ─────
const radarChartRef = ref<HTMLDivElement | null>(null)
let radarChart: ECharts | null = null

function initRadarChart() {
  if (!radarChartRef.value) return
  if (!radarChart) radarChart = echarts.init(radarChartRef.value)
  const scores = dimensions.value.map((d) => d.score)
  radarChart.setOption({
    tooltip: { trigger: 'item' },
    radar: {
      shape: 'circle',
      indicator: DIMENSION_NAMES.map((n) => ({ name: n, max: 100 })),
      axisLine: { lineStyle: { color: '#cfd8dc' } },
      splitLine: { lineStyle: { color: '#eceff1' } },
      name: { color: '#546e7a', fontWeight: 'bold', fontSize: 12 },
    },
    series: [{
      type: 'radar',
      data: [{
        value: scores,
        name: '素养得分',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,82,82,0.7)' },
            { offset: 1, color: 'rgba(211,47,47,0.15)' },
          ]),
        },
        lineStyle: { color: '#d32f2f', width: 2 },
        itemStyle: { color: '#d32f2f' },
        symbolSize: 6,
      }],
    }],
  })
}

// ───── 折线图 ─────
const radarData = ref<{ dates: string[]; totalScores: number[] }>({ dates: [], totalScores: [] })
const lineChartRef = ref<HTMLDivElement | null>(null)
let lineChart: ECharts | null = null

async function fetchGrowthTrack() {
  try {
    const res = await getGrowthTrack(selectedCourseId.value, 30)
    radarData.value = res
    await nextTick()
    initLineChart()
  } catch { /* 静默 */ }
}

function initLineChart() {
  if (!lineChartRef.value) return
  if (!lineChart) lineChart = echarts.init(lineChartRef.value)
  const { dates, totalScores } = radarData.value
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates.length ? dates : ['暂无数据'], boundaryGap: false },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      name: '综合得分',
      type: 'line',
      smooth: true,
      data: totalScores.length ? totalScores : [0],
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(211,47,47,0.4)' },
          { offset: 1, color: 'rgba(211,47,47,0.02)' },
        ]),
      },
      lineStyle: { color: '#d32f2f', width: 2 },
      itemStyle: { color: '#d32f2f' },
    }],
  })
}

// ───── 教师：报告管理 ─────
const reports = ref<ReportDTO[]>([])
const generating = ref(false)
let reportPollTimer: number | null = null

function reportStatusType(s: number): '' | 'info' | 'success' | 'warning' | 'danger' {
  return ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' } as Record<number, '' | 'info' | 'success' | 'warning' | 'danger'>)[s] ?? 'info'
}
function reportStatusLabel(s: number): string {
  return ({ 0: '等待中', 1: '生成中', 2: '已完成', 3: '失败' } as Record<number, string>)[s] ?? '—'
}

async function fetchReports() {
  try {
    const res = await getCourseReportList(selectedCourseId.value)
    reports.value = res?.records || []
  } catch { /* 静默 */ }
}

async function handleGenerateReport() {
  generating.value = true
  try {
    await generateCourseReport(selectedCourseId.value)
    ElMessage.success('报告生成已开始，请稍候')
    await fetchReports()
    // 轮询：每 3s 刷新一次列表，直到没有生成中的报告
    reportPollTimer = window.setInterval(async () => {
      await fetchReports()
      if (!reports.value.some((r) => r.status === 1)) {
        if (reportPollTimer) clearInterval(reportPollTimer)
      }
    }, 3000)
  } finally { generating.value = false }
}

async function handleDownloadReport(reportId: string) {
  try {
    const url = await getReportDownloadUrl(reportId)
    const a = document.createElement('a')
    a.href = url
    a.download = `课程报告_${new Date().toLocaleDateString()}.pdf`
    a.click()
  } catch { /* 统一错误处理 */ }
}

// ───── 窗口缩放 ─────
function onResize() {
  radarChart?.resize()
  lineChart?.resize()
}

onMounted(() => {
  fetchMyCourses()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  if (reportPollTimer) clearInterval(reportPollTimer)
  radarChart?.dispose()
  lineChart?.dispose()
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.report-page { display: flex; flex-direction: column; gap: 20px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.empty-tip { text-align: center; padding: 60px 0; }

/* ===== 统计卡片 ===== */
.stat-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }

.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.stat-icon {
  width: 46px; height: 46px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon.red    { background: #ffebee; color: #d32f2f; }
.stat-icon.blue   { background: #e3f2fd; color: #1976d2; }
.stat-icon.green  { background: #e8f5e9; color: #388e3c; }
.stat-icon.yellow { background: #fff3e0; color: #f57c00; }
.stat-icon.purple { background: #f3e5f5; color: #7b1fa2; }

.stat-num   { font-size: 22px; font-weight: 800; color: #263238; }
.stat-label { font-size: 12px; color: #78909c; margin-top: 2px; }

/* ===== 区块布局 ===== */
.section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.section-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f5f5;
}
.card-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #263238; }

/* ===== 雷达图 ===== */
.radar-chart { height: 320px; }

/* ===== 折线图 ===== */
.line-chart { height: 260px; }

/* ===== 维度详情 ===== */
.dimension-list { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: 350px; }

.dimension-item { display: flex; flex-direction: column; gap: 4px; }

.dimension-header { display: flex; align-items: center; gap: 8px; }
.dimension-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dimension-name { flex: 1; font-size: 14px; font-weight: 600; color: #263238; }
.dimension-score { font-size: 14px; font-weight: 700; color: #d32f2f; }
.dimension-desc { font-size: 12px; color: #90a4ae; margin-top: 2px; }

/* ===== 红色按钮 ===== */
.red-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important; color: #fff !important;
}
.red-sm-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 6px !important; color: #fff !important;
}

@media (max-width: 900px) {
  .stat-cards  { grid-template-columns: repeat(3, 1fr); }
  .section-row { grid-template-columns: 1fr; }
}
</style>
