<template>
  <div class="resource-page">

    <!-- ===== 页面顶部 Banner ===== -->
    <div class="resource-banner">
      <div class="banner-inner">
        <h1 class="banner-title">数字思政资源库</h1>
        <p class="banner-sub">汇聚优质课程思政资源，服务教学，启迪思想</p>
        <div class="banner-search">
          <el-input
            v-model="query.keyword"
            placeholder="搜索资源名称、作者..."
            :prefix-icon="Search"
            clearable
            size="large"
            class="banner-input"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-button size="large" class="search-btn" @click="handleSearch">搜索</el-button>
        </div>
      </div>
    </div>

    <!-- ===== 内容区 ===== -->
    <div class="page-body">

      <!-- 类型 Tab -->
      <div class="type-tabs">
        <button
          v-for="t in TYPE_TABS"
          :key="t.value"
          class="type-tab"
          :class="{ active: activeType === t.value }"
          @click="switchType(t.value)"
        >
          <el-icon class="tab-icon"><component :is="t.icon" /></el-icon>
          {{ t.label }}
          <span v-if="t.value === activeType" class="tab-bar" />
        </button>
      </div>

      <!-- 筛选区 -->
      <div class="filter-row">
        <!-- 分类 -->
        <div class="filter-group">
          <span class="filter-label">分类：</span>
          <el-scrollbar class="cate-scroll">
            <div class="cate-pills">
              <button class="cate-pill" :class="{ active: !query.categoryId }" @click="selectCategory(undefined)">不限</button>
              <button
                v-for="cat in categories"
                :key="cat.id"
                class="cate-pill"
                :class="{ active: query.categoryId === cat.id }"
                @click="selectCategory(cat.id)"
              >{{ cat.categoryName }}</button>
            </div>
          </el-scrollbar>
        </div>

        <!-- 标签 -->
        <div class="filter-group">
          <span class="filter-label">标签：</span>
          <el-scrollbar class="cate-scroll">
            <div class="cate-pills">
              <button class="cate-pill" :class="{ active: !query.tagId }" @click="selectTag(undefined)">不限</button>
              <button
                v-for="tag in enabledTags"
                :key="tag.id"
                class="cate-pill"
                :class="{ active: query.tagId === tag.id }"
                @click="selectTag(tag.id)"
              >{{ tag.tagName }}</button>
            </div>
          </el-scrollbar>
        </div>

        <!-- 排序 + 发布入口 -->
        <div class="filter-right">
          <el-select v-model="sortMode" style="width:110px" size="small" @change="handleSearch">
            <el-option label="最新发布" value="newest" />
            <el-option label="最多浏览" value="views" />
          </el-select>
          <el-button
            v-if="authStore.isTeacher || authStore.isAdmin"
            type="primary"
            :icon="Plus"
            size="small"
            class="publish-btn"
            @click="$router.push('/resource/create')"
          >发布资源</el-button>
        </div>
      </div>

      <!-- 资源卡片网格 -->
      <div v-loading="loading" class="resource-grid" element-loading-background="rgba(255,255,255,0.85)">
        <div
          v-for="r in resources"
          :key="r.id"
          class="resource-card"
          @click="$router.push(`/resource/${r.id}`)"
        >
          <!-- 封面 -->
          <div class="card-cover" :class="`bg-type-${r.resourceType}`">
            <img v-if="r.coverUrl" :src="r.coverUrl" :alt="r.title" class="cover-img" />
            <div v-else class="cover-fallback">
              <el-icon :size="40" color="rgba(255,255,255,0.85)"><component :is="typeIcon(r.resourceType)" /></el-icon>
            </div>
            <!-- 类型角标 -->
            <div class="cover-badge">
              <el-icon :size="12"><component :is="typeIcon(r.resourceType)" /></el-icon>
              {{ typeLabel(r.resourceType) }}
            </div>
            <!-- Hover 遮罩 -->
            <div class="cover-overlay">
              <div class="overlay-play">
                <el-icon :size="32" color="#fff"><View /></el-icon>
              </div>
            </div>
          </div>

          <!-- 信息区 -->
          <div class="card-info">
            <div class="card-top-meta">
              <span class="card-creator">{{ r.creatorName }}</span>
              <span v-if="r.categoryName" class="card-cat-tag">{{ r.categoryName }}</span>
            </div>
            <h4 class="card-title" :title="r.title">{{ r.title }}</h4>
            <p v-if="r.summary" class="card-summary">{{ r.summary }}</p>
            <div class="card-footer">
              <span class="card-time">{{ r.createdTime?.slice(0, 10) }}</span>
              <span class="card-views">
                <el-icon><View /></el-icon>{{ r.viewCount }}
              </span>
            </div>
            <!-- 标签 -->
            <div v-if="r.tags?.length" class="card-tags">
              <span v-for="tag in r.tags.slice(0, 3)" :key="tag.id" class="mini-tag">{{ tag.tagName }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-if="!loading && !resources.length"
        description="暂无相关资源"
        :image-size="120"
      >
        <el-button class="publish-btn" v-if="authStore.isTeacher || authStore.isAdmin" @click="$router.push('/resource/create')">
          发布第一个资源
        </el-button>
      </el-empty>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-if="total > query.pageSize!"
          v-model:current-page="query.pageNum"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[16, 32, 48]"
          layout="total, sizes, prev, pager, next"
          background
          @change="fetchResources"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, markRaw, onMounted } from 'vue'
import { Plus, Search, View, VideoPlay, Document, Headset, Reading } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getResourceList, getEnabledTags, getCategoryTree } from '@/api/resource'
import type { ResourceItem, TagItem, ResourceQuery, CategoryNode } from '@/api/resource'

const authStore = useAuthStore()

// ─── 类型 Tab ───
const TYPE_TABS = [
  { label: '全部', value: 0, icon: markRaw(Reading) },
  { label: '文章', value: 1, icon: markRaw(Document) },
  { label: '视频', value: 2, icon: markRaw(VideoPlay) },
  { label: '文档', value: 3, icon: markRaw(Document) },
  { label: '音频', value: 4, icon: markRaw(Headset) },
]
const activeType = ref(0)

function switchType(val: number) {
  activeType.value = val
  query.resourceType = val || undefined
  query.pageNum = 1
  fetchResources()
}

// ─── 类型辅助 ───
function typeIcon(t: number) { return { 1: markRaw(Document), 2: markRaw(VideoPlay), 3: markRaw(Document), 4: markRaw(Headset) }[t] ?? markRaw(Document) }
function typeLabel(t: number): string { return { 1: '文章', 2: '视频', 3: '文档', 4: '音频' }[t] ?? '资源' }

// ─── 查询参数 ───
const query = reactive<ResourceQuery & { resourceType?: number }>({
  keyword: '', categoryId: undefined, tagId: undefined,
  status: 2, resourceType: undefined, pageNum: 1, pageSize: 16,
})
const sortMode = ref<'newest' | 'views'>('newest')
const loading = ref(false)
const resources = ref<ResourceItem[]>([])
const total = ref(0)

async function fetchResources() {
  loading.value = true
  try {
    const res = await getResourceList(query)
    resources.value = (res as any)?.list ?? res?.records ?? []
    total.value = res?.total ?? 0
  } catch {
    resources.value = []
    total.value = 0
  } finally { loading.value = false }
}

function handleSearch() { query.pageNum = 1; fetchResources() }

// ─── 分类 ───
const categories = ref<CategoryNode[]>([])
function selectCategory(id: string | undefined) { query.categoryId = id; query.pageNum = 1; fetchResources() }

// ─── 标签 ───
const enabledTags = ref<TagItem[]>([])
function selectTag(id: string | undefined) { query.tagId = id; query.pageNum = 1; fetchResources() }

onMounted(async () => {
  await Promise.all([
    fetchResources(),
    getEnabledTags().then((r) => { enabledTags.value = r }),
    getCategoryTree().then((r) => { categories.value = r }),
  ])
})
</script>

<style scoped>
/* ===== Banner ===== */
.resource-banner {
  margin: -20px -24px 0;                    /* 撑满 MainLayout 内容区边距 */
  background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #ff6f00 100%);
  padding: 40px 0 48px;
  position: relative;
  overflow: hidden;
}
.resource-banner::before {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}

.banner-inner { max-width: 680px; margin: 0 auto; text-align: center; position: relative; }

.banner-title {
  margin: 0 0 10px;
  font-size: 32px; font-weight: 900; color: #fff;
  text-shadow: 0 2px 12px rgba(0,0,0,0.25);
  letter-spacing: 3px;
}

.banner-sub { margin: 0 0 24px; font-size: 15px; color: rgba(255,255,255,0.85); }

.banner-search { display: flex; gap: 10px; max-width: 540px; margin: 0 auto; }

.banner-input { flex: 1; border-radius: 10px !important; }
:deep(.banner-input .el-input__wrapper) {
  border-radius: 10px 0 0 10px !important;
  background: rgba(255,255,255,0.95);
  box-shadow: none !important;
}

.search-btn {
  background: #fff !important; color: #d32f2f !important;
  border: none !important; border-radius: 0 10px 10px 0 !important;
  font-weight: 700; width: 90px;
}
.search-btn:hover { background: #ffebee !important; }

/* ===== 页面主体 ===== */
.page-body { padding-top: 24px; }

/* ===== 类型 Tab ===== */
.type-tabs {
  display: flex; gap: 0;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 20px;
}

.type-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 22px;
  border: none; background: transparent;
  font-size: 15px; color: #78909c;
  cursor: pointer; transition: all 0.2s;
  position: relative;
  border-radius: 8px 8px 0 0;
}
.type-tab:hover { color: #d32f2f; background: #fff8f8; }
.type-tab.active { color: #d32f2f; font-weight: 700; }

.tab-icon { font-size: 17px; }

.tab-bar {
  position: absolute;
  bottom: -2px; left: 50%; transform: translateX(-50%);
  width: 60%; height: 3px;
  background: #d32f2f;
  border-radius: 2px 2px 0 0;
}

/* ===== 筛选行 ===== */
.filter-row {
  background: #fff;
  border-radius: 14px;
  padding: 14px 18px;
  display: flex; flex-direction: column; gap: 10px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.filter-group { display: flex; align-items: center; gap: 10px; }
.filter-label { font-size: 13px; font-weight: 700; color: #546e7a; white-space: nowrap; }

.cate-scroll { flex: 1; }
.cate-pills { display: flex; gap: 6px; padding-bottom: 2px; flex-wrap: nowrap; }

.cate-pill {
  padding: 4px 13px; border: 1.5px solid #e0e0e0;
  background: #fff; border-radius: 20px;
  font-size: 13px; color: #546e7a;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.cate-pill:hover { border-color: #ffcdd2; color: #d32f2f; }
.cate-pill.active { background: #d32f2f; border-color: #d32f2f; color: #fff; font-weight: 600; }

.filter-right { display: flex; gap: 10px; align-items: center; margin-left: auto; flex-shrink: 0; }

.publish-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important; color: #fff !important;
}

/* ===== 资源卡片网格 ===== */
.resource-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  min-height: 240px;
}

.resource-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.25s;
  display: flex; flex-direction: column;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.resource-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 28px rgba(211,47,47,0.14);
  border-color: #ffcdd2;
}

/* 封面 */
.card-cover {
  position: relative;
  height: 160px;
  overflow: hidden;
}

.bg-type-1 { background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #ff5252 100%); }
.bg-type-2 { background: linear-gradient(135deg, #1565c0 0%, #1976d2 60%, #42a5f5 100%); }
.bg-type-3 { background: linear-gradient(135deg, #2e7d32 0%, #388e3c 60%, #66bb6a 100%); }
.bg-type-4 { background: linear-gradient(135deg, #e65100 0%, #f57c00 60%, #ffa726 100%); }

.cover-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.resource-card:hover .cover-img { transform: scale(1.05); }

.cover-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}

.cover-badge {
  position: absolute; bottom: 8px; left: 8px;
  display: flex; align-items: center; gap: 4px;
  background: rgba(0,0,0,0.5); color: #fff;
  font-size: 11px; padding: 3px 8px; border-radius: 12px;
  backdrop-filter: blur(4px);
}

.cover-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.25s;
}
.resource-card:hover .cover-overlay { opacity: 1; }

.overlay-play {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: 2px solid rgba(255,255,255,0.6);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}

/* 信息区 */
.card-info { padding: 14px; flex: 1; display: flex; flex-direction: column; }
.card-top-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-creator { font-size: 13px; color: #78909c; }
.card-cat-tag { font-size: 11px; padding: 2px 6px; background: #f5f5f5; color: #909399; border-radius: 4px; border: 1px solid #ebeef5; }

.card-title {
  margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #263238;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.card-summary {
  margin: 0 0 12px; font-size: 13px; color: #607d8b; line-height: 1.5;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  flex: 1;
}

.card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f1f1; padding-top: 10px; margin-top: auto; }
.card-time { font-size: 12px; color: #90a4ae; }
.card-views { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #78909c; }
.card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
.mini-tag {
  font-size: 11px; padding: 2px 8px;
  background: #f5f5f5; color: #78909c; border-radius: 10px;
}

/* 分页 */
.pagination-wrap { display: flex; justify-content: center; padding: 24px 0 8px; }

@media (max-width: 1200px) { .resource-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .resource-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .resource-grid { grid-template-columns: 1fr; } .banner-title { font-size: 22px; } }
</style>
