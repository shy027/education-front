<template>
  <div class="topic-detail-page" v-loading="pageLoading">
    <!-- 返回 -->
    <el-button text :icon="ArrowLeft" class="back-btn" @click="$router.back()">返回研讨社区</el-button>

    <!-- 话题主体 -->
    <div class="topic-card" v-if="post">
      <div class="topic-header">
        <el-avatar :size="48" :src="post.authorAvatar">{{ post.authorName?.charAt(0) }}</el-avatar>
        <div class="author-info">
          <div class="author-name">{{ post.authorName }}</div>
          <div class="author-time">{{ post.createdTime?.slice(0, 16) }}</div>
        </div>
        <div class="topic-badges">
          <el-tag v-if="post.isTop" size="small" type="danger">置顶</el-tag>
          <el-tag v-if="post.isEssence" size="small" type="warning">精华</el-tag>
        </div>
      </div>

      <h1 class="topic-title">{{ post.title }}</h1>
      <div v-if="post.content" class="topic-content">{{ post.content }}</div>

      <div class="topic-actions">
        <el-button
          :class="['like-btn', { liked: liked }]"
          :icon="liked ? StarFilled : Star"
          round
          @click="handleLike"
        >
          {{ post.likeCount }} 点赞
        </el-button>
        <span class="comment-count">
          <el-icon><ChatDotRound /></el-icon>{{ post.commentCount }} 条评论
        </span>
        <!-- 教师操作 -->
        <div v-if="authStore.isTeacher" class="teacher-ops">
          <el-button text size="small" :type="post.isTop ? 'default' : 'warning'" @click="handleTop">
            {{ post.isTop ? '取消置顶' : '设为置顶' }}
          </el-button>
          <el-button text size="small" :type="post.isEssence ? 'default' : 'success'" @click="handleEssence">
            {{ post.isEssence ? '取消精华' : '设为精华' }}
          </el-button>
          <el-button text size="small" type="danger" @click="handleDeletePost">删除话题</el-button>
        </div>
      </div>
    </div>

    <!-- 评论区 -->
    <div class="comment-section">
      <div class="section-header">
        <h3>全部评论 ({{ post?.commentCount ?? 0 }})</h3>
      </div>

      <!-- 发表评论 -->
      <div class="comment-input-card">
        <el-avatar :size="36" :src="authStore.userInfo?.avatar" style="flex-shrink:0">
          {{ authStore.userInfo?.realName?.charAt(0) }}
        </el-avatar>
        <div class="input-wrap">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="2"
            placeholder="分享您的学习见解和思考..."
            :autosize="{ minRows: 2, maxRows: 6 }"
            resize="none"
          />
          <div class="input-actions">
            <span class="char-count">{{ newComment.length }}/500</span>
            <el-button type="primary" class="submit-btn" :loading="submitting" @click="handleSubmitComment">
              发表评论
            </el-button>
          </div>
        </div>
      </div>

      <!-- 评论列表 -->
      <div v-if="commentLoading" class="comment-loading">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else class="comment-list">
        <div v-for="c in comments" :key="c.id" class="comment-item">
          <el-avatar :size="38" :src="c.authorAvatar">{{ c.authorName?.charAt(0) }}</el-avatar>
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-author">{{ c.authorName }}</span>
              <span class="comment-time">{{ c.createdTime?.slice(0, 16) }}</span>
            </div>
            <div class="comment-text">{{ c.content }}</div>
            <div class="comment-actions">
              <el-button
                text
                size="small"
                :class="{ liked: c.liked }"
                :icon="c.liked ? StarFilled : Star"
                @click="handleCommentLike(c)"
              >{{ c.likeCount }}</el-button>
              <el-button text size="small" @click="replyTo(c)">回复</el-button>
              <el-button
                v-if="canDeleteComment(c)"
                text
                size="small"
                type="danger"
                @click="handleDeleteComment(c)"
              >删除</el-button>
            </div>

            <!-- 回复输入框 -->
            <div v-if="replyingId === c.id" class="reply-input">
              <el-input
                v-model="replyContent"
                placeholder="输入回复..."
                size="small"
                @keyup.enter="submitReply(c)"
              >
                <template #append>
                  <el-button @click="submitReply(c)" :loading="submitting">回复</el-button>
                </template>
              </el-input>
            </div>

            <!-- 子评论 -->
            <div v-if="c.children?.length" class="sub-comments">
              <div v-for="sub in c.children" :key="sub.id" class="sub-comment">
                <el-avatar :size="26" :src="sub.authorAvatar">{{ sub.authorName?.charAt(0) }}</el-avatar>
                <div class="sub-body">
                  <span class="comment-author">{{ sub.authorName }}</span>：{{ sub.content }}
                </div>
                <el-button
                  v-if="canDeleteComment(sub)"
                  text
                  size="small"
                  type="danger"
                  :icon="Delete"
                  circle
                  @click="handleDeleteComment(sub)"
                />
              </div>
            </div>
          </div>
        </div>

        <el-empty v-if="!comments.length && !commentLoading" description="暂无评论，来发表您的观点吧" :image-size="80" />

        <div class="load-more" v-if="commentTotal > comments.length">
          <el-button text @click="loadMoreComments">加载更多评论</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Star, StarFilled, ChatDotRound, Delete } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getPostDetail, getCommentList, createComment, deleteComment,
  togglePostLike, toggleCommentLike, togglePostTop, togglePostEssence, deletePost,
} from '@/api/community'
import type { PostItem, CommentItem } from '@/api/community'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const postId = route.params.id as string

// ───── 话题数据 ─────
const pageLoading = ref(false)
const post = ref<PostItem | null>(null)
const liked = ref(false)

async function fetchPost() {
  pageLoading.value = true
  try {
    post.value = await getPostDetail(postId)
  } finally { pageLoading.value = false }
}

async function handleLike() {
  if (!post.value) return
  const res = await togglePostLike(postId)
  liked.value = res.liked
  post.value.likeCount = res.likeCount
}

async function handleTop() {
  if (!post.value) return
  const next = post.value.isTop ? 0 : 1
  await togglePostTop(postId, next)
  post.value.isTop = next
  ElMessage.success(next ? '已置顶' : '已取消置顶')
}

async function handleEssence() {
  if (!post.value) return
  const next = post.value.isEssence ? 0 : 1
  await togglePostEssence(postId, next)
  post.value.isEssence = next
  ElMessage.success(next ? '已设为精华' : '已取消精华')
}

async function handleDeletePost() {
  await ElMessageBox.confirm('确定删除该话题？', '提示', { type: 'warning' })
  await deletePost(postId)
  ElMessage.success('话题已删除')
  router.back()
}

// ───── 评论 ─────
const commentLoading = ref(false)
const comments = ref<CommentItem[]>([])
const commentTotal = ref(0)
const commentPage = ref(1)
const PAGE_SIZE = 10

async function fetchComments(reset = false) {
  if (reset) { commentPage.value = 1; comments.value = [] }
  commentLoading.value = true
  try {
    const res = await getCommentList({ postId, pageNum: commentPage.value, pageSize: PAGE_SIZE })
    comments.value = [...comments.value, ...res.records]
    commentTotal.value = res.total
  } finally { commentLoading.value = false }
}

function loadMoreComments() {
  commentPage.value++
  fetchComments()
}

// ───── 发表评论 ─────
const newComment = ref('')
const submitting = ref(false)

async function handleSubmitComment() {
  if (!newComment.value.trim()) { ElMessage.warning('请输入评论内容'); return }
  if (newComment.value.length > 500) { ElMessage.warning('评论不超过 500 字'); return }
  submitting.value = true
  try {
    const res = await createComment({ postId, content: newComment.value })
    newComment.value = ''
    // 插入到头部
    comments.value.unshift({ ...res, children: [] })
    commentTotal.value++
    if (post.value) post.value.commentCount++
  } finally { submitting.value = false }
}

// ───── 回复 ─────
const replyingId = ref<string | null>(null)
const replyContent = ref('')

function replyTo(c: CommentItem) {
  replyingId.value = replyingId.value === c.id ? null : c.id
  replyContent.value = ''
}

async function submitReply(parent: CommentItem) {
  if (!replyContent.value.trim()) return
  submitting.value = true
  try {
    const res = await createComment({ postId, content: replyContent.value, parentId: parent.id })
    if (!parent.children) parent.children = []
    parent.children.push({ ...res, children: [] })
    replyContent.value = ''
    replyingId.value = null
    if (post.value) post.value.commentCount++
  } finally { submitting.value = false }
}

// ───── 评论点赞 ─────
async function handleCommentLike(c: CommentItem) {
  const res = await toggleCommentLike(c.id)
  c.liked = res.liked
  c.likeCount = res.likeCount
}

// ───── 删除评论 ─────
function canDeleteComment(c: CommentItem): boolean {
  return authStore.isTeacher || authStore.isAdmin || c.authorId === authStore.userInfo?.userId
}

async function handleDeleteComment(c: CommentItem) {
  await ElMessageBox.confirm('确定删除该评论？', '提示', { type: 'warning' })
  await deleteComment(c.id)
  // 从列表或父节点子评论中移除
  const idx = comments.value.findIndex((r) => r.id === c.id)
  if (idx !== -1) {
    comments.value.splice(idx, 1)
  } else {
    for (const root of comments.value) {
      const subIdx = root.children?.findIndex((s) => s.id === c.id) ?? -1
      if (subIdx !== -1) { root.children.splice(subIdx, 1); break }
    }
  }
  if (post.value) post.value.commentCount = Math.max(0, post.value.commentCount - 1)
  ElMessage.success('已删除')
}

onMounted(() => {
  fetchPost()
  fetchComments(true)
})
</script>

<style scoped>
.topic-detail-page { display: flex; flex-direction: column; gap: 16px; }

.back-btn { margin-bottom: 4px; color: #78909c; }

/* ===== 话题卡片 ===== */
.topic-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.topic-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }

.author-info { flex: 1; }
.author-name { font-size: 15px; font-weight: 700; color: #263238; }
.author-time { font-size: 12px; color: #90a4ae; margin-top: 2px; }

.topic-badges { display: flex; gap: 6px; }

.topic-title { margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #1a1a1a; line-height: 1.4; }

.topic-content {
  font-size: 15px; color: #37474f; line-height: 1.8;
  background: #fafafa; border-radius: 10px; padding: 16px;
  margin-bottom: 20px;
  white-space: pre-wrap;
}

.topic-actions { display: flex; align-items: center; gap: 16px; padding-top: 16px; border-top: 1px solid #f5f5f5; }

.like-btn { transition: all 0.2s; border-color: #e0e0e0 !important; }
.like-btn.liked { background: #ffebee !important; border-color: #d32f2f !important; color: #d32f2f !important; }

.comment-count { display: flex; align-items: center; gap: 4px; font-size: 14px; color: #78909c; }
.teacher-ops { margin-left: auto; display: flex; gap: 4px; }

/* ===== 评论区 ===== */
.comment-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.section-header { margin-bottom: 16px; }
.section-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #263238; }

/* ===== 输入框 ===== */
.comment-input-card { display: flex; gap: 12px; margin-bottom: 24px; }
.input-wrap { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.input-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.char-count { font-size: 12px; color: #b0bec5; }
.submit-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important; border-radius: 8px !important;
}

:deep(.el-textarea__inner:focus) { box-shadow: 0 0 0 1px #d32f2f inset !important; }

/* ===== 评论列表 ===== */
.comment-loading { padding: 12px 0; }
.comment-list { display: flex; flex-direction: column; gap: 20px; }

.comment-item { display: flex; gap: 12px; }

.comment-body { flex: 1; min-width: 0; }
.comment-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.comment-author { font-size: 14px; font-weight: 700; color: #455a64; }
.comment-time   { font-size: 12px; color: #b0bec5; }

.comment-text { font-size: 14px; color: #37474f; line-height: 1.7; margin-bottom: 8px; }

.comment-actions { display: flex; gap: 4px; }
.liked.el-button { color: #d32f2f !important; }

/* ===== 回复 ===== */
.reply-input { margin-top: 8px; }

/* ===== 子评论 ===== */
.sub-comments { background: #f9f9f9; border-radius: 10px; padding: 12px; margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }

.sub-comment { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #546e7a; }
.sub-body { flex: 1; }

.load-more { text-align: center; padding-top: 12px; }
</style>
