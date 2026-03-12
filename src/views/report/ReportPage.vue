<template>
  <div class="report-page">

    <!-- ===== 详情态 ===== -->
    <div v-if="detailCourse || authStore.isStudent" class="detail-view">
      <div class="detail-header">
        <el-button v-if="!authStore.isStudent" :icon="ArrowLeft" text @click="backToList">返回报告列表</el-button>
        <div class="detail-header-info">
          <h2 class="detail-title">{{ authStore.isStudent ? '个人综合素养全景' : detailCourse?.courseName }}</h2>
          <p class="detail-desc">{{ authStore.isStudent ? '汇聚全平台学习数据的素养画像' : '课程报告管理' }}</p>
        </div>
      </div>

      <div v-loading="detailLoading">

        <!-- ===== 学生详情 ===== -->
        <template v-if="authStore.isStudent">
          <!-- 统计卡片 -->
          <div class="stat-cards">
            <div class="stat-card">
              <div class="stat-icon red"><el-icon :size="22"><DataAnalysis /></el-icon></div>
              <div><div class="stat-num">{{ stats?.totalWatchDuration ? Math.floor(stats.totalWatchDuration / 60) + ' min' : '—' }}</div><div class="stat-label">学习时长</div></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon blue"><el-icon :size="22"><Comment /></el-icon></div>
              <div><div class="stat-num">{{ stats?.totalPosts ?? '—' }}</div><div class="stat-label">参与讨论</div></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon green"><el-icon :size="22"><Finished /></el-icon></div>
              <div><div class="stat-num">{{ stats?.totalAnswers ?? '—' }}</div><div class="stat-label">完成作业</div></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon yellow"><el-icon :size="22"><Trophy /></el-icon></div>
              <div><div class="stat-num">{{ profile?.totalScore?.toFixed(1) ?? '—' }}</div><div class="stat-label">综合得分</div></div>
            </div>
            <div class="stat-card">
              <div class="stat-icon purple"><el-icon :size="22"><Medal /></el-icon></div>
              <div><div class="stat-num">{{ profile?.level ?? '—' }}</div><div class="stat-label">综合等级</div></div>
            </div>
          </div>

          <!-- 雷达图 + 维度 -->
          <div class="section-row">
            <div class="section-card radar-card">
              <div class="card-header">
                <h3>六维素养雷达图</h3>
              </div>
              <div ref="radarChartRef" class="radar-chart" />
            </div>
            <div class="section-card dimension-card">
              <div class="card-header"><h3>维度详情</h3></div>
              <div class="dimension-list">
                <div v-for="(d, idx) in dimensions" :key="d.name" class="dimension-item">
                  <div class="dimension-header">
                    <span class="dimension-dot" :style="{ background: RADAR_COLORS[idx] }" />
                    <span class="dimension-name">{{ d.name }}</span>
                    <span class="dimension-score">{{ d.score }}%</span>
                  </div>
                  <el-progress :percentage="d.score" :stroke-width="6" :show-text="false" :color="RADAR_COLORS[idx]" />
                  <div class="dimension-desc">{{ d.desc }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 成长轨迹 -->
          <div class="section-card">
            <div class="card-header">
              <h3>素养成长轨迹（近 30 天）</h3>
              <el-button size="small" class="red-sm-btn" @click="fetchGrowthTrack">刷新</el-button>
            </div>
            <div ref="lineChartRef" class="line-chart" />
          </div>
        </template>

        <!-- ===== 教师/校领导详情：仅报告管理 ===== -->
        <template v-else>
          <div class="section-card">
            <div class="card-header">
              <h3>课程报告列表</h3>
              <el-button type="primary" class="red-btn" :loading="generating" @click="handleGenerateReport">
                生成报告
              </el-button>
            </div>
            <el-empty v-if="!reports.length" description="暂无报告" :image-size="80" />
            <el-table v-else :data="reports" stripe style="width:100%">
              <el-table-column label="报告标题">
                <template #default="{ row }">
                  {{ row.reportTitle || ((row.reportType === 2 ? '学校报告' : '课程报告') + ' · ' + (row.generateTime || row.createdTime || '').slice(0, 10)) }}
                </template>
              </el-table-column>
              <el-table-column label="类型" width="110" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.reportType === 2 ? 'warning' : 'primary'" size="small">
                    {{ row.reportType === 2 ? '学校报告' : '课程报告' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="生成时间" width="160">
                <template #default="{ row }">{{ (row.generateTime || row.createdTime || '').slice(0, 16) }}</template>
              </el-table-column>
              <el-table-column label="操作" align="center" width="100">
                <template #default="{ row }">
                  <el-button v-if="row.fileUrl" type="primary" size="small" class="red-btn" @click="handleDownloadDirect(row.fileUrl)">下载</el-button>
                  <el-button v-else type="primary" size="small" class="red-btn" @click="handleDownloadReport(row.id)">下载</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>

      </div>
    </div>

    <!-- ===== 列表态 (教师/校领导) ===== -->
    <div v-else-if="!authStore.isStudent">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ authStore.isStudent ? '素养报告' : '教学报告' }}</h2>
          <p class="page-desc">
            {{ authStore.isStudent ? '查看每门课程的个人素养画像' : authStore.isSchoolLeader ? '查看课程教学报告及学校整体分析报告' : '为我的课程生成并查看教学分析报告' }}
          </p>
        </div>
      </div>

      <div v-loading="listLoading">
        <!-- 学生：无课程时空态 -->
        <div v-if="authStore.isStudent && !myCourseOptions.length" class="empty-tip">
          <el-empty description="您尚未加入任何课程" :image-size="120">
            <el-button type="primary" class="red-btn" @click="$router.push('/course')">去加入课程</el-button>
          </el-empty>
        </div>

        <!-- 教师/校领导：无课程时空态 -->
        <div v-else-if="!authStore.isStudent && !myCourseOptions.length" class="empty-tip">
          <el-empty description="暂无课程报告" :image-size="120" />
        </div>

        <!-- 有课程时：课程报告卡片列表 -->
        <template v-else>
          <!-- 课程报告区块 -->
          <div class="section-group">
            <div class="group-title">
              <el-icon><Reading /></el-icon>
              课程报告
            </div>
            <div class="course-report-grid">
              <div
                v-for="c in myCourseOptions"
                :key="c.courseId"
                class="course-report-card"
                @click="openDetail(c)"
              >
                <div class="crc-cover">
                  <img v-if="c.courseCover || c.cover" :src="c.courseCover ?? c.cover" class="crc-cover-img" @error="(e) => { e.target.parentElement.innerHTML = '<div class=\'crc-cover-default\'><i class=\'el-icon\' style=\'font-size: 40px; color: rgba(255, 255, 255, 0.7);\'><svg viewBox=\'0 0 1024 1024\' xmlns=\'http://www.w3.org/2000/svg\'><path fill=\'currentColor\' d=\'M128 128h768v768H128V128zm64 64v640h640V192H192zM320 320h384v64H320v-64zm0 192h384v64H320v-64zm0 192h256v64H320v-64z\'></path></svg></i></div>' }" />
                  <div v-else class="crc-cover-default"><el-icon size="40" color="rgba(255,255,255,0.7)"><Reading /></el-icon></div>
                </div>
                <div class="crc-body">
                  <div class="crc-label">{{ c.courseName }} 的报告</div>
                  <div class="crc-meta"><el-icon><User /></el-icon><span>{{ c.teacherName || '—' }}</span></div>
                  <!-- 教师/校领导：最近报告状态 -->
                  <div v-if="!authStore.isStudent" class="crc-status">
                    <template v-if="latestReportMap[c.courseId]">
                      <el-tag :type="reportStatusType(latestReportMap[c.courseId]!.status)" size="small">
                        {{ reportStatusLabel(latestReportMap[c.courseId]!.status) }}
                      </el-tag>
                      <span class="crc-time">{{ latestReportMap[c.courseId]!.createdTime?.slice(0, 10) }}</span>
                    </template>
                    <span v-else class="crc-no-report">尚未生成报告</span>
                  </div>
                  <!-- 学生：素养等级 -->
                  <div v-else class="crc-status">
                    <template v-if="profileMap[c.courseId]">
                      <el-tag type="danger" size="small">{{ profileMap[c.courseId]!.level }}</el-tag>
                      <span class="crc-score">{{ profileMap[c.courseId]!.totalScore?.toFixed(1) }} 分</span>
                    </template>
                    <span v-else class="crc-no-report">暂无评估</span>
                  </div>
                </div>
                <div class="crc-arrow"><el-icon><ArrowRight /></el-icon></div>
              </div>
            </div>
          </div>

          <!-- 校领导额外：学校报告区块 -->
          <div v-if="authStore.isSchoolLeader" class="section-group">
            <div class="group-title">
              <el-icon><OfficeBuilding /></el-icon>
              学校报告
            </div>
            <div v-if="schoolReports.length === 0" class="school-report-empty">
              <el-empty description="暂无学校报告" :image-size="80" />
            </div>
            <el-table v-else :data="schoolReports" stripe style="width:100%">
              <el-table-column label="报告 ID" prop="id" width="220" show-overflow-tooltip />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="reportStatusType(row.status)" size="small">{{ reportStatusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="生成时间" width="160">
                <template #default="{ row }">{{ row.createdTime?.slice(0, 16) }}</template>
              </el-table-column>
              <el-table-column label="操作" align="center" width="100">
                <template #default="{ row }">
                  <el-button v-if="row.status === 2" text type="primary" size="small" @click="handleDownloadReport(row.id)">下载</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { useAuthStore } from '@/stores/auth'
import { getMyCourses } from '@/api/course'
import type { MyCourseItem } from '@/api/course'
import {
  getMyProfile, getRadarData, getGrowthTrack, getLearningStatistics,
  calculateMyProfile, generateCourseReport, getCourseReportList,
  getReportDownloadUrl, getAllReportList,
} from '@/api/report'
import type { ProfileResponse, RadarDataResponse, StatisticsResponse, ReportDTO } from '@/api/report'
import { ElMessage } from 'element-plus'
import {
  DataAnalysis, Comment, Finished, Trophy, Medal,
  ArrowLeft, ArrowRight, User, Reading, OfficeBuilding,
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const RADAR_COLORS = ['#d32f2f', '#f57c00', '#388e3c', '#1976d2', '#7b1fa2', '#673ab7']

// ──── 列表数据 ────
const myCourseOptions = ref<MyCourseItem[]>([])
const listLoading = ref(false)
const profileMap = ref<Record<string, ProfileResponse>>({})
const latestReportMap = ref<Record<string, ReportDTO>>({})
const schoolReports = ref<ReportDTO[]>([])

async function fetchListData() {
  listLoading.value = true
  try {
    if (authStore.isStudent) {
      await openDetailForStudent()
      return
    }

    const res = await getMyCourses()
    myCourseOptions.value = res.teaching ?? []

    // 并行加载每课摘要
    await Promise.all(myCourseOptions.value.map(c => loadCourseSummary(c)))

    // 校领导：加载学校报告
    if (authStore.isSchoolLeader) {
      try {
        const sr = await getAllReportList({ reportType: 2, pageNum: 1, pageSize: 50 })
        schoolReports.value = sr?.list || sr?.records || []
      } catch { /* 静默 */ }
    }
  } finally {
    listLoading.value = false
  }
}

async function loadCourseSummary(c: MyCourseItem) {
  const id = String(c.courseId ?? '')
  try {
    if (authStore.isStudent) {
      profileMap.value[id] = await getMyProfile(id)
    } else {
      const res = await getCourseReportList(id, { pageNum: 1, pageSize: 1 })
      const rec = res?.list?.[0]
      if (rec) latestReportMap.value[id] = rec
    }
  } catch { /* 静默 */ }
}

// ──── 详情态 ────
const detailCourse = ref<MyCourseItem | null>(null)
const detailLoading = ref(false)
const profile = ref<ProfileResponse | null>(null)
const stats = ref<StatisticsResponse | null>(null)
const reports = ref<ReportDTO[]>([])
const calculating = ref(false)
const generating = ref(false)
let reportPollTimer: number | null = null

const radarData = ref<RadarDataResponse | null>(null)

const dimensions = computed(() => {
  if (radarData.value?.dimensions) {
    return radarData.value.dimensions.map(d => ({
      name: d.name,
      score: d.score,
      desc: '' // 描述可以设为空，或者根据名称映射
    }))
  }
  // 默认空数据
  return []
})

function currentCourseId() {
  if (authStore.isStudent) return '0' // 学生全局画像使用伪造全局 ID
  const c = detailCourse.value
  return c ? String(c.courseId ?? '') : ''
}

async function openDetailForStudent() {
  detailLoading.value = true
  try {
    const cid = '0'
    await Promise.all([
      getMyProfile(cid).then(r => { profile.value = r }).catch(() => { profile.value = null }),
      getRadarData(cid).then(r => { radarData.value = r }).catch(() => { radarData.value = null }),
      getLearningStatistics(cid).then(r => { stats.value = r }).catch(() => { stats.value = null }),
      fetchGrowthTrack(),
    ])
    await nextTick()
    initRadarChart()
    initLineChart()
  } finally { detailLoading.value = false }
}

async function openDetail(c: MyCourseItem) {
  detailCourse.value = c
  detailLoading.value = true
  try {
    const cid = String(c.courseId ?? '')
    await Promise.all([
      fetchGrowthTrack(),
      fetchReports()
    ])
  } finally { detailLoading.value = false }
}

function backToList() {
  detailCourse.value = null
  profile.value = null; stats.value = null; reports.value = []
  if (reportPollTimer) clearInterval(reportPollTimer)
}

async function fetchReports() {
  try {
    const res = await getCourseReportList(currentCourseId(), { pageNum: 1, pageSize: 20 })
    reports.value = res?.list ?? []
  } catch { /* 静默 */ }
}

async function doCalculate() {
  calculating.value = true
  try {
    await calculateMyProfile(currentCourseId())
    profile.value = await getMyProfile(currentCourseId())
    radarData.value = await getRadarData(currentCourseId())
    initRadarChart()
    ElMessage.success('评估已更新')
  } finally { calculating.value = false }
}

async function handleGenerateReport() {
  generating.value = true
  try {
    await generateCourseReport(currentCourseId())
    ElMessage.success('报告生成已开始，请稍候')
    await fetchReports()
    reportPollTimer = window.setInterval(async () => {
      await fetchReports()
      if (!reports.value.some(r => r.status === 1)) clearInterval(reportPollTimer!)
    }, 3000)
  } finally { generating.value = false }
}

async function handleDownloadReport(id: string | number) {
  try {
    const url = await getReportDownloadUrl(String(id))
    const a = document.createElement('a')
    a.href = url; a.download = `报告_${new Date().toLocaleDateString()}.pdf`; a.click()
  } catch { /* 统一错误处理 */ }
}

function handleDownloadDirect(fileUrl: string) {
  const a = document.createElement('a')
  a.href = fileUrl
  a.target = '_blank'
  a.download = `报告_${new Date().toLocaleDateString()}.pdf`
  a.click()
}

function reportStatusType(s: number): '' | 'info' | 'success' | 'warning' | 'danger' {
  return ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' } as Record<number, '' | 'info' | 'success' | 'warning' | 'danger'>)[s] ?? 'info'
}
function reportStatusLabel(s: number): string {
  return ({ 0: '等待中', 1: '生成中', 2: '已完成', 3: '失败' } as Record<number, string>)[s] ?? '—'
}

// ──── 图表 ────
const radarChartRef = ref<HTMLDivElement | null>(null)
let radarChart: ECharts | null = null

function initRadarChart() {
  if (!radarChartRef.value || !authStore.isStudent || !dimensions.value.length) return
  if (!radarChart) radarChart = echarts.init(radarChartRef.value)
  radarChart.setOption({
    tooltip: { trigger: 'item' },
    radar: {
      shape: 'circle',
      indicator: dimensions.value.map(d => ({ name: d.name, max: 100 })),
      axisLine: { lineStyle: { color: '#cfd8dc' } },
      splitLine: { lineStyle: { color: '#eceff1' } },
      name: { color: '#546e7a', fontWeight: 'bold', fontSize: 12 },
    },
    series: [{
      type: 'radar',
      data: [{
        value: dimensions.value.map(d => d.score), name: '素养得分',
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255,82,82,0.7)' }, { offset: 1, color: 'rgba(211,47,47,0.15)' }
        ]) },
        lineStyle: { color: '#d32f2f', width: 2 }, itemStyle: { color: '#d32f2f' }, symbolSize: 6,
      }],
    }],
  })
}

const lineChartRef = ref<HTMLDivElement | null>(null)
let lineChart: ECharts | null = null
const growthData = ref<GrowthTrackResponse | null>(null)

async function fetchGrowthTrack() {
  try {
    const res = await getGrowthTrack(currentCourseId(), 30)
    growthData.value = res
    await nextTick(); initLineChart()
  } catch { /* 静默 */ }
}

function initLineChart() {
  if (!lineChartRef.value) return
  if (!lineChart) lineChart = echarts.init(lineChartRef.value)
  const dates = growthData.value?.trackData?.map(p => p.date) || []
  const totalScores = growthData.value?.trackData?.map(p => p.totalScore) || []
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates.length ? dates : ['暂无数据'], boundaryGap: false },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      name: '综合得分', type: 'line', smooth: true,
      data: totalScores.length ? totalScores : [0],
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(211,47,47,0.4)' }, { offset: 1, color: 'rgba(211,47,47,0.02)' }
      ]) },
      lineStyle: { color: '#d32f2f', width: 2 }, itemStyle: { color: '#d32f2f' },
    }],
  })
}

function onResize() { radarChart?.resize(); lineChart?.resize() }

onMounted(() => { fetchListData(); window.addEventListener('resize', onResize) })
onUnmounted(() => {
  if (reportPollTimer) clearInterval(reportPollTimer)
  radarChart?.dispose(); lineChart?.dispose()
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.report-page { display: flex; flex-direction: column; gap: 20px; }

/* ===== 页头 ===== */
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { margin: 0 0 4px; font-size: 22px; font-weight: 800; color: #263238; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }
.empty-tip  { text-align: center; padding: 60px 0; }

/* ===== 分组标题 ===== */
.section-group { display: flex; flex-direction: column; gap: 14px; }
.group-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: #455a64;
  padding-bottom: 8px; border-bottom: 2px solid #ffcdd2;
  margin-bottom: 4px;
}
.group-title .el-icon { color: #d32f2f; font-size: 18px; }

/* ===== 课程报告卡片 ===== */
.course-report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.course-report-card {
  background: #fff; border-radius: 14px; overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
  cursor: pointer; transition: all 0.25s;
  display: flex; align-items: center; gap: 0;
  position: relative;
}
.course-report-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.crc-cover {
  width: 90px; height: 80px; flex-shrink: 0;
  background: linear-gradient(135deg, #d32f2f, #ff5252);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.crc-cover-img { width: 100%; height: 100%; object-fit: cover; }
.crc-cover-default { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

.crc-body { padding: 12px 14px; flex: 1; display: flex; flex-direction: column; gap: 5px; }
.crc-label { font-size: 14px; font-weight: 700; color: #263238; line-height: 1.4; }
.crc-meta { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #90a4ae; }
.crc-status { display: flex; align-items: center; gap: 8px; }
.crc-time { font-size: 12px; color: #90a4ae; }
.crc-score { font-size: 13px; font-weight: 700; color: #d32f2f; }
.crc-no-report { font-size: 12px; color: #b0bec5; }

.crc-arrow { padding: 0 14px 0 4px; color: #cfd8dc; font-size: 16px; transition: color 0.2s; }
.course-report-card:hover .crc-arrow { color: #d32f2f; }

/* ===== 学校报告空态 ===== */
.school-report-empty { background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }

/* ===== 详情态 ===== */
.detail-view { display: flex; flex-direction: column; gap: 20px; }
.detail-header {
  display: flex; align-items: center; gap: 16px;
  background: #fff; border-radius: 14px; padding: 16px 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
.detail-header-info { flex: 1; }
.detail-title { margin: 0 0 2px; font-size: 18px; font-weight: 800; color: #263238; }
.detail-desc  { margin: 0; font-size: 13px; color: #90a4ae; }

/* ===== 统计卡片 ===== */
.stat-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.stat-card {
  background: #fff; border-radius: 14px; padding: 18px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
.stat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon.red { background: #ffebee; color: #d32f2f; }
.stat-icon.blue { background: #e3f2fd; color: #1976d2; }
.stat-icon.green { background: #e8f5e9; color: #388e3c; }
.stat-icon.yellow { background: #fff3e0; color: #f57c00; }
.stat-icon.purple { background: #f3e5f5; color: #7b1fa2; }
.stat-num   { font-size: 22px; font-weight: 800; color: #263238; }
.stat-label { font-size: 12px; color: #78909c; margin-top: 2px; }

/* ===== 区块 ===== */
.section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.section-card {
  background: #fff; border-radius: 16px; padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f5f5f5;
}
.card-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: #263238; }

.radar-chart { height: 260px; }
.line-chart  { height: 220px; }

.dimension-list { display: flex; flex-direction: column; gap: 14px; }
.dimension-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dimension-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dimension-name { font-size: 13px; font-weight: 600; color: #37474f; flex: 1; }
.dimension-score { font-size: 13px; font-weight: 700; color: #263238; }
.dimension-desc { font-size: 11px; color: #90a4ae; margin-top: 4px; }

/* ===== 按钮 ===== */
.red-btn {
  background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%) !important;
  color: #fff !important; border: none !important; border-radius: 8px !important; font-weight: 600;
}
.red-btn:hover { background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%) !important; box-shadow: 0 4px 12px rgba(211,47,47,0.35) !important; }
.red-sm-btn {
  background: linear-gradient(135deg, #ff5252 0%, #d32f2f 100%) !important;
  color: #fff !important; border: none !important; border-radius: 6px !important;
}

@media (max-width: 900px) {
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .section-row { grid-template-columns: 1fr; }
  .course-report-grid { grid-template-columns: 1fr; }
}
</style>
