<template>
  <div class="literacy-config">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">素养算法配置</h2>
        <p class="page-desc">调整 5 维度素养计算权重、阈值及资源评分规则</p>
      </div>
      <div class="header-actions">
        <el-button 
          v-if="!configErrors.length"
          type="danger" 
          :icon="DataAnalysis" 
          :loading="calcLoading"
          @click="handleRecalculateAll"
        >
          重算全员画像
        </el-button>
        <el-button 
          type="warning" 
          :icon="Refresh" 
          :loading="refreshLoading"
          @click="handleRefreshCache"
        >
          刷新缓存
        </el-button>
        <el-button 
          type="primary" 
          :icon="Select" 
          :loading="saveLoading"
          @click="handleSaveAll"
        >
          保存所有修改
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="24" v-if="configErrors.length > 0">
        <el-alert
          title="算法配置不完整提示"
          type="error"
          show-icon
          :closable="false"
          class="mb-20"
        >
          <template #default>
            <p>由于以下配置项缺失或为 NULL，素养画像评分引擎目前已**停止工作**（详情见后台日志 NPE 拦截）。请尽快完善以下参数：</p>
            <ul class="error-list">
              <li v-for="err in configErrors" :key="err">{{ err }}</li>
            </ul>
          </template>
        </el-alert>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 左侧：基础权重与阈值 -->
      <el-col :span="8">
        <!-- 维度权重 -->
        <el-card class="config-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Odometer /></el-icon> 维度综合权重</span>
              <el-tag size="small" :type="Math.abs(weightSum - 1) < 0.001 ? 'success' : 'danger'">
                总和: {{ weightSum.toFixed(2) }}
              </el-tag>
            </div>
          </template>
          <div class="weight-item" v-for="i in 5" :key="i">
            <span class="label">维度 {{ i }} ({{ dimensionNames['dimension' + i] || '未命名' }})</span>
            <el-input-number 
              v-model="weights['dimension' + i]" 
              :precision="2" 
              :step="0.05" 
              :min="0" 
              :max="1"
              size="small"
            />
          </div>
          <p class="hint">注：所有维度权重之和必须等于 1.00</p>
        </el-card>

        <!-- 等级阈值 -->
        <el-card class="config-card mt-20" shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Rank /></el-icon> 等级评价阈值</span>
            </div>
          </template>
          <el-form label-width="80px" size="small">
            <el-form-item label="优秀 (≥)">
              <el-input-number v-model="thresholds.excellent" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="良好 (≥)">
              <el-input-number v-model="thresholds.good" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="合格 (≥)">
              <el-input-number v-model="thresholds.pass" :min="0" :max="100" />
            </el-form-item>
          </el-form>
          <p class="hint">规则：优秀 > 良好 > 合格 > 0</p>
        </el-card>

        <!-- 评分切分 -->
        <el-card class="config-card mt-20" shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Connection /></el-icon> 评分构成 (双通道)</span>
            </div>
          </template>
          <el-form label-width="120px" size="small">
            <el-form-item label="课程侧上限">
              <el-input-number v-model="scoreConfig.course_cap" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="资源侧上限">
              <el-input-number v-model="scoreConfig.resource_cap" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="单资源浏览分">
              <el-input-number v-model="scoreConfig.resource_view_point" :precision="1" :step="0.1" :min="0" />
            </el-form-item>
          </el-form>
          <p class="hint">建议：上限总和为 100</p>
        </el-card>

        <!-- 课程行为基础分 -->
        <el-card class="config-card mt-20" shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><EditPen /></el-icon> 课程行为基础分</span>
            </div>
          </template>
          <el-form label-width="120px" size="small">
            <el-form-item label="查看课件">
              <el-input-number v-model="behaviorWeights.VIEW_COURSEWARE" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="提交任务(基础)">
              <el-input-number v-model="behaviorWeights.SUBMIT_TASK" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="回复讨论">
              <el-input-number v-model="behaviorWeights.POST_COMMENT" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="话题加精(格外)">
              <el-input-number v-model="behaviorWeights.ESSENCE_POST" :min="0" :max="100" />
            </el-form-item>
          </el-form>
          <p class="hint">注：加分将全额叠加至课程选中的所有维度</p>
        </el-card>
      </el-col>

      <!-- 右侧：标签权重矩阵 -->
      <el-col :span="16">
        <el-card class="config-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><CollectionTag /></el-icon> 资源标签权重矩阵</span>
            </div>
          </template>
          <el-table :data="tagList" border stripe size="small">
            <el-table-column prop="tagName" label="标签名称" width="120" fixed />
            <el-table-column label="上限分" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.max_score" :min="0" :max="100" controls-position="right" size="small" style="width: 80px" />
              </template>
            </el-table-column>
            <el-table-column v-for="i in 5" :key="i" :label="dimensionNames['dimension' + i] || ('D'+i)" min-width="140" align="center">
              <template #default="{ row }">
                <el-rate 
                  v-model="row.weights['dimension' + i]" 
                  :max="5"
                  allow-half
                  clearable
                  class="star-rate"
                />
                <div class="star-value">权重: {{ row.weights['dimension' + i] ? (row.weights['dimension' + i] * 0.2).toFixed(2) : '0.00' }}</div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, Select, Odometer, Rank, Connection, CollectionTag, DataAnalysis, EditPen
} from '@element-plus/icons-vue'
import {
  getWeightsConfig, updateWeightsConfig,
  getThresholdsConfig, updateThresholdsConfig,
  getScoreConfig, updateScoreConfig,
  getTagWeights, updateTagWeights,
  getBehaviorWeights, updateBehaviorWeights,
  refreshConfigCache, recalculateAllProfiles
} from '@/api/report'

// ───── 状态 ─────
const saveLoading = ref(false)
const refreshLoading = ref(false)
const calcLoading = ref(false)
const dimensionNames = ref<Record<string, string>>({
  dimension1: '知识技能素养',
  dimension2: '职业品格素养',
  dimension3: '创新实践素养',
  dimension4: '社会责任素养',
  dimension5: '发展适应素养'
})

// 各模块数据
const weights = ref<Record<string, number>>({})
const thresholds = ref({ excellent: 90, good: 80, pass: 60 })
const scoreConfig = ref({ course_cap: 80, resource_cap: 20, resource_view_point: 2.0 })
const behaviorWeights = ref<Record<string, number>>({ 
    VIEW_COURSEWARE: 2, SUBMIT_TASK: 10, POST_COMMENT: 2, ESSENCE_POST: 5 
})
const tagList = ref<any[]>([])

// 计算权重总和 (处理浮点数精度)
const weightSum = computed(() => {
  let sum = 0
  for (let i = 1; i <= 5; i++) {
    sum += Number(weights.value['dimension' + i] || 0)
  }
  return Math.round(sum * 100) / 100
})

// 检查配置错误
const configErrors = computed(() => {
  const errors: string[] = []
  if (scoreConfig.value.course_cap == null) errors.push('评分构成: 课程侧得分上限缺失')
  if (scoreConfig.value.resource_cap == null) errors.push('评分构成: 资源侧得分上限缺失')
  if (scoreConfig.value.resource_view_point == null) errors.push('评分构成: 单次资源浏览分值缺失')
  
  const incompleteTags = tagList.value.filter(t => t.max_score == null)
  if (incompleteTags.length > 0) {
    errors.push(`标签映射: 有 ${incompleteTags.length} 个标签缺失“上限分”配置`)
  }
  
  for (let i = 1; i <= 5; i++) {
    if (weights.value['dimension' + i] == null) {
        errors.push(`维度权重: 维度 ${i} 权重缺失 (NULL)`)
    }
  }
  
  return errors
})

// ───── 加载数据 ─────
async function fetchData() {
  try {
    const [w, t, s, tags, b] = await Promise.all([
      getWeightsConfig(),
      getThresholdsConfig(),
      getScoreConfig(),
      getTagWeights(),
      getBehaviorWeights()
    ])
    
    // 1. 标准化维度权重 (用户要求：读取什么就是什么，不强制设 0)
    const normalizedWeights: Record<string, any> = {}
    for (let i = 1; i <= 5; i++) {
        normalizedWeights['dimension' + i] = w['dimension' + i] ?? w['dimension_' + i] ?? null
    }
    weights.value = normalizedWeights
    
    // 2. 阈值
    thresholds.value = { 
        excellent: t.excellent, 
        good: t.good, 
        pass: t.pass 
    }
    
    // 3. 评分配置 (不设默认值)
    scoreConfig.value = {
        course_cap: s.course_cap ?? s.courseCap ?? null,
        resource_cap: s.resource_cap ?? s.resourceCap ?? null,
        resource_view_point: s.resource_view_point ?? s.resourceViewPoint ?? null
    }
    
    // 3.5 行为权重
    behaviorWeights.value = {
        VIEW_COURSEWARE: b.VIEW_COURSEWARE ?? 0,
        SUBMIT_TASK: b.SUBMIT_TASK ?? 0,
        POST_COMMENT: b.POST_COMMENT ?? b.POST_REPLY ?? 0,
        ESSENCE_POST: b.ESSENCE_POST ?? 0
    }
    
    // 4. 转换标签 Map 为列表
    const backendTags = tags || {}
    const defaultTagNames = ['专业理论', '技术技能', '理想信念', '文化自信', '职业道德', '工匠精神', '科学素养', '社会责任', '法治意识', '心理健康']
    const allTagNames = Array.from(new Set([...defaultTagNames, ...Object.keys(backendTags)]))
    
    tagList.value = allTagNames.map(name => {
      const config = backendTags[name] || {}
      const tagWeights: Record<string, any> = {}
      for (let i = 1; i <= 5; i++) {
          const val = config.weights?.['dimension' + i] ?? config.weights?.['dimension_' + i] ?? 0
          // 始终将后端的小数权重 (0-1) 转换为前端显示的星级 (0-5)
          tagWeights['dimension' + i] = Number(val) * 5
      }
      return {
        tagName: name,
        max_score: config.max_score ?? config.maxScore ?? null,
        weights: tagWeights
      }
    })
  } catch (err) {
    console.error('Fetch config error:', err)
    ElMessage.error('获取配置失败')
  }
}

// ───── 刷新缓存 ─────
async function handleRefreshCache() {
  refreshLoading.value = true
  try {
    await Promise.all([
      refreshConfigCache('profile.dimension_weights'),
      refreshConfigCache('profile.level_thresholds'),
      refreshConfigCache('profile.score_config'),
      refreshConfigCache('profile.resource_tag_weights'),
      refreshConfigCache('profile.behavior_weights')
    ])
    ElMessage.success('配置缓存已刷新，计算引擎已同步最新参数')
  } finally {
    refreshLoading.value = false
  }
}

// ───── 重算全员 ─────
async function handleRecalculateAll() {
  try {
    await ElMessageBox.confirm(
      '重算全员画像将根据最新的维度映射和评分构成，对全校产生过行为数据的学生进行“画像重校正”。此过程为异步执行，是否继续？',
      '风险确认',
      {
        confirmButtonText: '确定重算',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    calcLoading.value = true
      await recalculateAllProfiles(0) // 0 代表全校
      ElMessage.success('重算指令已下推，请等待 1-2 分钟后刷新页面查看')
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Recalculate error:', err)
      ElMessage.error('重算请求失败')
    }
  } finally {
    calcLoading.value = false
  }
}

// ───── 保存所有 ─────
async function handleSaveAll() {
  if (Math.abs(weightSum.value - 1) > 0.001) {
    return ElMessage.error('维度权重总和必须等于 1.00')
  }
  
  if (thresholds.value.excellent <= thresholds.value.good || thresholds.value.good <= thresholds.value.pass) {
    return ElMessage.error('等级阈值必须满足：优秀 > 良好 > 合格')
  }

  saveLoading.value = true
  try {
    // 转换标签列表回 Map
    const tagWeightsData = tagList.value.reduce((acc, item) => {
      const convertedWeights: Record<string, number> = {}
      for (let i = 1; i <= 5; i++) {
        const starVal = item.weights['dimension' + i] || 0
        // 将星级 (0-5) 转换为后端逻辑所需的权重 (0-1)
        convertedWeights['dimension' + i] = Math.round((starVal * 0.2) * 100) / 100
      }
      acc[item.tagName] = {
        max_score: item.max_score,
        weights: convertedWeights
      }
      return acc
    }, {} as Record<string, any>)

    await Promise.all([
      updateWeightsConfig(weights.value),
      updateThresholdsConfig(thresholds.value),
      updateScoreConfig(scoreConfig.value),
      updateTagWeights(tagWeightsData),
      updateBehaviorWeights(behaviorWeights.value)
    ])
    
    ElMessage.success('所有配置已成功保存')
  } catch (err: any) {
    ElMessage.error('保存失败: ' + (err.message || '未知错误'))
  } finally {
    saveLoading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.literacy-config {
  padding: 4px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #d32f2f; }
.page-desc  { margin: 0; font-size: 13px; color: #78909c; }

.config-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #37474f;
}

.weight-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.weight-item .label {
  font-size: 13px;
  color: #546e7a;
}

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #90a4ae;
  font-style: italic;
}

.mt-20 { margin-top: 20px; }
.mb-20 { margin-bottom: 20px; }

.error-list {
  margin: 5px 0 0;
  padding-left: 18px;
  font-size: 13px;
}

.star-rate {
  display: inline-flex;
  vertical-align: middle;
}
.star-value {
  font-size: 11px;
  color: #90a4ae;
  margin-top: -4px;
}
</style>
