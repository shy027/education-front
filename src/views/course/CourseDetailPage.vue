<template>
  <div class="course-detail-page" v-loading="pageLoading">
    <!-- 课程头部信息 -->
    <div class="course-hero" v-if="course">
      <div class="hero-cover">
        <img v-if="course.courseCover" :src="course.courseCover" :alt="course.courseName" />
        <div v-else class="cover-default"><el-icon :size="48" color="rgba(255,255,255,0.7)"><Reading /></el-icon></div>
      </div>
      <div class="hero-info">
        <div class="hero-badges">
          <el-tag size="small" :type="statusType(course)">{{ statusLabel(course) }}</el-tag>
          <!-- 仅在非草稿状态显示加入方式和领域，使其在创建初期显得更“净” -->
          <template v-if="course.auditStatus !== -1">
            <el-tag size="small" type="info">{{ joinTypeLabel(course.joinType) }}</el-tag>
            <el-tag v-if="course.subjectArea" size="small">{{ course.subjectArea }}</el-tag>
          </template>
        </div>
        <h1 class="hero-title">{{ course.courseName }}</h1>
        <p class="hero-desc">{{ course.courseIntro || '暂无课程介绍' }}</p>
        <div class="hero-meta">
          <span><el-icon><User /></el-icon> {{ course.teacherName }}</span>
          <span><el-icon><UserFilled /></el-icon> {{ course.studentCount ?? course.memberCount ?? 0 }} 人参与</span>
        </div>
        <!-- 操作区 -->
        <div class="hero-actions">
          <!-- 加入/退出：仅学生可见，教师（无论是否是该课程创建者）均不显示 -->
          <el-button
            v-if="!authStore.isTeacher && !authStore.isAdmin && !isMember && !isCourseFinished"
            type="primary"
            class="join-btn"
            :loading="joining"
            @click="handleJoin"
          >加入课程</el-button>
          <el-button
            v-if="!authStore.isTeacher && !authStore.isAdmin && isMember && !isCourseFinished"
            type="danger"
            plain
            :loading="quitting"
            @click="handleQuit"
          >退出课程</el-button>
          <template v-if="authStore.isTeacher && isMyTeaching">
            <!-- 草稿状态下的操作按钮 -->
            <template v-if="course.auditStatus === -1 || course.auditStatus === 2">
              <el-button 
                type="warning" 
                plain 
                :icon="Edit" 
                @click="showEditDialog = true"
              >编辑信息</el-button>
              <el-button 
                type="success" 
                :loading="submittingReview"
                @click="handleSubmitReview"
              >提交审核</el-button>
              <el-button 
                type="danger" 
                plain 
                @click="handleDeleteDraft"
              >删除草稿</el-button>
            </template>
            <!-- 审核中状态：锁定编辑 -->
            <el-button
              v-else-if="course.auditStatus === 0"
              disabled
              :icon="Edit"
            >审核中 (基础信息已锁定)</el-button>
            <!-- 审核通过状态：编辑按钮消失 (符合需求: 审核通过一行的四个按钮全部消失) -->
          </template>
        </div>
      </div>
    </div>

    <!-- Tab 内容 -->
    <el-tabs v-model="activeTab" class="content-tabs" @tab-click="onTabChange">
      <!-- ===== 课件 Tab ===== -->
      <el-tab-pane label="📚 课件" name="ware">
        <div class="ware-layout" v-loading="wareLoading">
          <!-- 左：章节树 -->
          <div class="chapter-tree">
            <div class="tree-header">
              章节目录
              <el-button v-if="isMyTeaching && !isCourseFinished" text :icon="Plus" size="small" @click="showAddChapterDialog = true">
                添加章节
              </el-button>
            </div>
            <div v-if="chapters.length === 0" class="tree-empty">暂无章节</div>
            <el-tree
              v-else
              :data="chapters"
              :props="{ children: 'children', label: 'chapterName' }"
              node-key="id"
              highlight-current
              :expand-on-click-node="false"
              default-expand-all
              @node-click="handleChapterClick"
              class="custom-chapter-tree"
            >
              <template #default="{ data }">
                <span class="custom-tree-node" :class="{ 'active': selectedChapterId === data.id }">
                  <el-icon><FolderOpened /></el-icon>
                  <span>{{ data.chapterName }}</span>
                </span>
              </template>
            </el-tree>
          </div>

          <!-- 右：课件及资源列表 -->
          <div class="ware-list-wrap">
            <div class="ware-list-header">
              <span>{{ selectedChapterId ? '课件与资源列表' : '全部课件与资源' }}</span>
              <div v-if="isMyTeaching && !isCourseFinished && selectedChapterId" style="display: flex; gap: 10px;">
                <el-button type="primary" size="small" :icon="Plus" class="red-sm-btn" @click="openAddWareDialog">
                  上传课件
                </el-button>
                <el-button type="success" size="small" :icon="Link" @click="openBindResourceDialog">
                  关联资源
                </el-button>
              </div>
            </div>
            <div v-if="wares.length === 0 && selectedChapterResources.length === 0" class="ware-empty">
              <el-empty :description="selectedChapterId ? '该章节暂无内容' : '暂无课件或资源'" :image-size="60" />
            </div>
            
            <div
              v-for="w in wares"
              :key="w.id"
              class="ware-item"
              @click="openWare(w)"
            >
              <div class="ware-icon" :class="`type-${w.wareType}`">
                <el-icon><component :is="wareIcon(w.wareType)" /></el-icon>
              </div>
              <div class="ware-info">
                <div class="ware-title">{{ w.wareTitle }}</div>
                <div class="ware-meta">
                  <el-tag size="small" :type="wareAuditType(w.auditStatus)">{{ wareAuditLabel(w.auditStatus) }}</el-tag>
                  <span v-if="w.duration">{{ Math.floor(w.duration / 60) }}min</span>
                </div>
              </div>
              <div v-if="w.progress !== undefined" class="ware-progress">
                <el-progress :percentage="w.progress" :stroke-width="4" :show-text="false" color="#d32f2f" style="width:80px" />
                <span class="progress-text">{{ w.progress }}%</span>
              </div>
              <el-button v-if="w.allowDownload === 1 && canInteract" text type="primary" size="small" :icon="Download" @click.stop="downloadWare(w)">下载</el-button>
              <el-button v-if="isMyTeaching && !isCourseFinished" text type="danger" size="small" :icon="Delete" @click.stop="deleteWareById(w.id)" />
            </div>

            <!-- 选定章节关联共享资源列表 -->
            <div
              v-for="res in selectedChapterResources"
              :key="res.resourceId"
              class="ware-item bound-resource"
              @click="openChapterResource(res)"
            >
              <div class="ware-icon" :class="`type-${res.resourceType}`">
                <el-icon><component :is="wareIcon(res.resourceType)" /></el-icon>
              </div>
              <div class="ware-info">
                <div class="ware-title">{{ res.title }} <el-tag size="small" effect="plain" type="info" style="margin-left: 8px;">共享资源</el-tag></div>
                <div class="ware-meta">
                  <span>关联于: {{ res.bindTime?.slice(0, 10) }}</span>
                </div>
              </div>
              <el-button v-if="isMyTeaching && !isCourseFinished" text type="danger" size="small" :icon="Delete" @click.stop="toggleBindResource({id: res.resourceId} as any)">取消</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== 任务 Tab ===== -->
      <el-tab-pane label="📋 任务" name="task">
        <div v-loading="taskLoading">
          <div class="tab-toolbar">
            <span class="toolbar-total">共 {{ tasks.length }} 项任务</span>
            <el-button v-if="isMyTeaching && !isCourseFinished" type="primary" :icon="Plus" size="small" class="red-sm-btn" @click="showCreateTaskDialog = true">
              创建任务
            </el-button>
          </div>
          <el-empty v-if="!tasks.length" description="暂无任务" :image-size="80" />
          <div class="task-list">
            <div v-for="t in tasks" :key="t.id" class="task-item">
              <div class="task-type-icon" :class="`task-type-${t.taskType}`">
                {{ { 1: '作业', 2: '测验', 3: '考试' }[t.taskType] }}
              </div>
              <div class="task-info">
                <div class="task-name">{{ t.taskTitle }}</div>
                <div class="task-meta">
                  <span v-if="t.endTime">截止：{{ t.endTime.slice(0, 10) }}</span>
                  <span v-if="t.totalScore">满分：{{ t.totalScore }} 分</span>
                  <el-tag size="small" :type="taskStatusType(t.status)">{{ taskStatusLabel(t.status) }}</el-tag>
                </div>
              </div>
              <div class="task-actions">
                <el-tag v-if="!isMyTeaching" size="small">{{ t.submitCount }} 人参与</el-tag>
                <el-button v-if="isMyTeaching && !isCourseFinished" text type="danger" size="small" @click="deleteTaskById(t.id)">删除</el-button>
                <!-- 临时测试功能：学生手动完成任务 -->
                <el-button 
                  v-if="!isMyTeaching && isMember && !isCourseFinished" 
                  type="success" 
                  size="small" 
                  @click="handleCompleteTestTask(t)"
                >完成 (测试)</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ===== 讨论 Tab ===== -->
      <el-tab-pane label="💬 讨论" name="discuss">
        <div v-loading="postLoading">
          <div class="tab-toolbar">
            <span class="toolbar-total">共 {{ posts.total }} 个话题</span>
            <!-- 仅教师可发布话题（API规定 POST /posts 需要 TEACHER 权限） -->
            <el-button v-if="isMyTeaching && !isCourseFinished" type="primary" :icon="Plus" size="small" class="red-sm-btn" @click="showCreatePostDialog = true">
              发布话题
            </el-button>
          </div>
          <el-empty v-if="!posts.list.length" description="暂无讨论话题" :image-size="80" />
          <div class="post-list">
            <div
              v-for="p in posts.list"
              :key="p.id"
              class="post-item"
              @click="handlePostClick(String(p.id))"
            >
              <el-avatar :size="36" :src="p.userAvatar">{{ p.userName?.charAt(0) }}</el-avatar>
              <div class="post-content">
                <div class="post-title">
                  <el-tag v-if="p.isTop" size="small" type="danger" class="top-tag">置顶</el-tag>
                  <el-tag v-if="p.isEssence" size="small" type="warning" class="top-tag">精华</el-tag>
                  {{ p.postTitle }}
                </div>
                <div class="post-meta">{{ p.userName }} · {{ p.createdTime?.slice(0, 10) }}</div>
              </div>
              <div class="post-stats">
                <span><el-icon><ChatDotRound /></el-icon>{{ p.commentCount }}</span>
                <span><el-icon><Star /></el-icon>{{ p.likeCount }}</span>
              </div>
            </div>
          </div>
          <el-pagination
            v-if="posts.total > postQuery.pageSize!"
            v-model:current-page="postQuery.pageNum"
            :page-size="postQuery.pageSize"
            :total="posts.total"
            layout="prev, pager, next"
            background
            style="margin-top:16px"
            @current-change="fetchPosts"
          />
        </div>
      </el-tab-pane>

      <!-- ===== 公告 Tab ===== -->
      <el-tab-pane label="📢 公告" name="notice">
        <div v-loading="noticeLoading">
          <div class="tab-toolbar">
            <span />
            <el-button v-if="isMyTeaching && !isCourseFinished" type="primary" :icon="Plus" size="small" class="red-sm-btn" @click="showCreateNoticeDialog = true">
              发布公告
            </el-button>
          </div>
          <el-empty v-if="!announcements.length" description="暂无公告" :image-size="80" />
          <div class="notice-list">
            <div v-for="n in announcements" :key="n.id" class="notice-item-card" @click="openNotice(n)">
              <div class="notice-header">
                <div class="notice-title">
                  <el-tag v-if="n.isTop" size="small" type="danger">置顶</el-tag>
                  {{ n.title }}
                </div>
                <div class="notice-time">{{ n.createdTime?.slice(0, 10) }}</div>
              </div>
              <p class="notice-preview">{{ n.content?.slice(0, 80) }}{{ n.content?.length > 80 ? '...' : '' }}</p>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 公告详情对话框 -->
    <el-dialog v-model="noticeDialogVisible" :title="selectedNotice?.title" width="600px">
      <div class="notice-full-content" v-html="selectedNotice?.content?.replace(/\n/g, '<br/>')" />
      <template #footer>
        <el-button @click="noticeDialogVisible = false">关闭</el-button>
        <el-button v-if="isMyTeaching && !isCourseFinished" type="danger" plain @click="deleteNoticeById(selectedNotice!.id)">删除</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBindResourceDialog" title="绑定资源库内容" width="750px" destroy-on-close>
      <div v-loading="bindResourceLoading" style="min-height: 200px;">
        <div style="margin-bottom: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
          <el-input v-model="resourceQuery.keyword" placeholder="搜索资源库标题..." style="width: 200px;" clearable />
          
          <el-select v-model="resourceQuery.resourceType" placeholder="资源类型" clearable style="width: 120px;">
            <el-option label="文章" :value="1" />
            <el-option label="视频" :value="2" />
            <el-option label="文档(PDF)" :value="3" />
            <el-option label="音频" :value="4" />
          </el-select>

          <el-cascader
            v-model="resourceQuery.categoryId"
            :options="categoryTree"
            :props="{ value: 'id', label: 'categoryName', children: 'children', checkStrictly: true, emitPath: false }"
            placeholder="全部分类"
            clearable
            style="width: 150px"
          />

          <el-select v-model="resourceQuery.tagId" placeholder="选择标签" clearable style="width: 150px">
            <el-option v-for="t in tagList" :key="t.id" :label="t.tagName" :value="t.id" />
          </el-select>

          <el-button type="primary" :icon="Search" @click="fetchAvailableResources">搜索</el-button>
        </div>
        
        <el-table 
          :data="availableResources" 
          height="350" 
          border 
          @row-click="handleResourceRowClick"
          :row-style="{ cursor: 'pointer' }"
        >
          <el-table-column property="title" label="标题" show-overflow-tooltip min-width="150" />
          <el-table-column property="resourceType" label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="small">{{ ({1:'文章',2:'视频',3:'文档',4:'音频'} as Record<number, string>)[row.resourceType as number] || '其他' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column property="categoryName" label="分类" width="100" show-overflow-tooltip />
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button 
                size="small" 
                :type="isResourceBound(row.id) ? 'danger' : 'primary'"
                @click.stop="toggleBindResource(row)"
              >
                {{ isResourceBound(row.id) ? '解绑' : '绑定' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- AI 资源推荐面板 (插入式) -->
        <div 
          v-if="aiRecommendResult || aiRecommendLoading" 
          class="ai-recommend-section" 
          v-loading="aiRecommendLoading"
          element-loading-text="AI 正在分析并推荐资源..."
        >
          <el-divider><el-icon color="#d32f2f"><MagicStick /></el-icon> AI 智能推荐资源</el-divider>
          <div v-if="aiRecommendResult" class="recommend-list">
            <template v-if="aiRecommendResult.recommendations && aiRecommendResult.recommendations.length > 0">
              <div v-for="rec in aiRecommendResult.recommendations" :key="rec.resourceId" class="recommend-card">
                <div class="recommend-info">
                  <div class="recommend-header">
                    <span class="rec-title">{{ rec.title }}</span>
                    <el-tag size="small" type="success" effect="dark">{{ Math.round(rec.matchScore * 100) }}% 匹配</el-tag>
                  </div>
                  <div class="rec-reason">{{ rec.reason }}</div>
                </div>
                <el-button 
                  size="small" 
                  :type="isResourceBound(rec.resourceId) ? 'danger' : 'primary'"
                  plain
                  @click="toggleBindResource({id: rec.resourceId} as any)"
                >
                  {{ isResourceBound(rec.resourceId) ? '解绑' : '智能绑定' }}
                </el-button>
              </div>
            </template>
            <el-empty v-else :image-size="40" description="AI 暂未发现更合适的推荐资源" />
          </div>
        </div>

        <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-button type="primary" :icon="MagicStick" :loading="aiRecommendLoading" @click="fetchAiRecommendations">
              基于课程信息推荐
            </el-button>
            <el-upload
              :auto-upload="true"
              :http-request="handleAiRecommendByFile"
              :show-file-list="false"
              accept=".pdf,.doc,.docx"
            >
              <el-button type="success" :icon="Upload" :loading="aiRecommendLoading">
                上传大纲深度推荐
              </el-button>
            </el-upload>
          </div>
          <el-pagination
            background
            layout="prev, pager, next, total"
            :total="resourceQueryTotal"
            :current-page="resourceQuery.pageNum"
            :page-size="resourceQuery.pageSize"
            @current-change="handleResourcePageChange"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 创建话题对话框 -->
    <el-dialog v-model="showCreatePostDialog" title="发布讨论话题" width="520px">
      <el-form :model="postForm" label-width="70px" size="large">
        <el-form-item label="标题" required>
          <el-input v-model="postForm.postTitle" placeholder="输入话题标题" clearable />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="postForm.postContent" type="textarea" :rows="4" placeholder="描述您的讨论内容（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreatePostDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="postSubmitting" @click="handleCreatePost">发布</el-button>
      </template>
    </el-dialog>

    <!-- 发布公告对话框 -->
    <el-dialog v-model="showCreateNoticeDialog" title="发布公告" width="520px">
      <el-form :model="noticeForm" label-width="70px" size="large">
        <el-form-item label="标题" required>
          <el-input v-model="noticeForm.title" placeholder="公告标题" clearable />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="noticeForm.content" type="textarea" :rows="5" placeholder="公告内容" />
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="noticeForm.isTop" :active-value="1" :inactive-value="0" active-color="#d32f2f" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateNoticeDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="noticeSubmitting" @click="handleCreateNotice">发布</el-button>
      </template>
    </el-dialog>

    <!-- 上传课件对话框 -->
    <el-dialog v-model="showAddWareDialog" title="上传课件" width="520px" @close="resetWareForm">
      <el-form :model="wareForm" label-width="80px" size="large">
        <el-form-item label="标题" required>
          <el-input v-model="wareForm.wareTitle" placeholder="请输入课件标题" clearable />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="wareForm.wareType" placeholder="请选择课件类型" style="width: 100%">
            <el-option label="视频" :value="1" />
            <el-option label="文档 (PDF)" :value="2" />
            <el-option label="PPT" :value="3" />
            <el-option label="音频" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件" required>
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="true"
            :http-request="handleUploadWare"
            :limit="1"
            :file-list="wareFileList"
            :on-remove="() => { wareForm.fileUrl = ''; wareFileList = [] }"
            accept=".mp4,.pdf,.ppt,.pptx,.mp3"
          >
            <el-button type="primary" :loading="uploadingFile">点击选择文件上传</el-button>
            <template #tip>
               <div class="el-upload__tip">请确保文件格式与所选类型匹配，不超过100MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="允许下载">
          <el-switch v-model="wareForm.allowDownload" :active-value="1" :inactive-value="0" active-color="#d32f2f" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="wareForm.description" type="textarea" :rows="3" placeholder="课件描述信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddWareDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="wareSubmitting" @click="handleCreateWare">确定上传</el-button>
      </template>
    </el-dialog>

    <!-- 编辑课程基本信息对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑课程" width="900px" @open="initEditForm" class="ai-dialog">
      <el-row :gutter="30">
        <!-- 左侧：主要信息表单 (14) -->
        <el-col :span="14" class="form-section">
          <el-form :model="editForm" label-width="90px" size="large">
            <el-form-item label="课程名称" required>
              <el-input v-model="editForm.courseName" placeholder="课程名称" clearable maxlength="50" show-word-limit />
            </el-form-item>
            <el-form-item label="课程简介">
              <el-input v-model="editForm.courseIntro" type="textarea" :rows="5" placeholder="课程简介" />
            </el-form-item>
            <el-form-item label="课程封面">
              <el-upload
                class="cover-uploader"
                :show-file-list="false"
                :http-request="handleUploadCover"
                accept="image/*"
                :disabled="coverUploading"
              >
                <div v-if="editForm.courseCover" class="cover-preview">
                  <img :src="editForm.courseCover" class="cover-image" />
                  <div class="cover-edit-mask">
                    <el-icon><Edit /></el-icon>
                  </div>
                </div>
                <div v-else class="cover-placeholder" v-loading="coverUploading">
                  <el-icon class="cover-uploader-icon"><Plus /></el-icon>
                </div>
              </el-upload>
            </el-form-item>
            <el-form-item label="学科领域">
              <el-select v-model="editForm.subjectArea" placeholder="选择学科领域" style="width: 100%" clearable>
                <el-option v-for="s in subjectAreaOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
            <el-form-item label="加入方式">
              <el-radio-group v-model="editForm.joinType">
                <el-radio :value="1">公开加入</el-radio>
                <el-radio :value="2">审批加入</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="开课时间" required>
              <el-date-picker
                v-model="editForm.startTime"
                type="datetime"
                placeholder="选择开课时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="结课时间">
              <el-date-picker
                v-model="editForm.endTime"
                type="datetime"
                placeholder="选择结课时间 (可选)"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </el-col>

        <!-- 右侧：AI 辅助区 (10) -->
        <el-col :span="10" class="ai-section">
          <div class="ai-panel">
            <div class="ai-title">
              <el-icon color="#d32f2f" style="margin-right:6px"><MagicStick /></el-icon>
              <span>AI 辅助智能解析</span>
            </div>
            <p class="ai-tip">上传您的课程大纲、简介文档（PDF/Word），AI 将自动帮您提取课程信息。</p>
            
            <el-upload
              drag
              action="#"
              :auto-upload="true"
              :http-request="handleAiAnalyze"
              accept=".pdf,.doc,.docx"
              :show-file-list="false"
              class="ai-uploader"
              :disabled="aiLoading"
            >
              <el-icon v-if="!aiLoading" class="el-icon--upload"><UploadFilled /></el-icon>
              <div v-if="!aiLoading" class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <div v-else class="ai-loading-box">
                <el-icon class="is-loading"><Loading /></el-icon>
                <p>AI 正在深度解析中...</p>
              </div>
            </el-upload>

            <div v-if="aiResult" class="ai-result-preview">
              <el-divider content-position="left">解析建议结果</el-divider>
              <div v-if="aiResult.courseName" class="suggest-item">
                <div class="label">建议名称:</div>
                <div class="val">{{ aiResult.courseName }}</div>
              </div>
              <div v-if="aiResult.subjectArea" class="suggest-item">
                <div class="label">建议学科:</div>
                <div class="val"><el-tag size="small" type="success">{{ aiResult.subjectArea }}</el-tag></div>
              </div>
              <div class="suggest-item">
                <div class="label">建议思政标签:</div>
                <div class="tags">
                  <el-tag v-for="tag in aiResult.suggestedTags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
                </div>
              </div>
              <div v-if="aiResult.suggestedDimensions?.length" class="suggest-item">
                <div class="label">建议考核维度:</div>
                <div class="tags">
                  <el-tag v-for="dimKey in aiResult.suggestedDimensions" :key="dimKey" size="small" type="warning" effect="plain">
                    {{ dimensionList.find(d => d.key === dimKey)?.name || dimKey }}
                  </el-tag>
                </div>
              </div>
              <div class="suggest-item">
                <div class="label">提取关键词:</div>
                <div class="tags">
                  <el-tag v-for="k in aiResult.keywords" :key="k" size="small" type="info" effect="plain">{{ k }}</el-tag>
                </div>
              </div>
              <el-button type="success" :icon="Check" size="small" style="width:100%;margin-top:10px" @click="applyAiResult">
                一键应用至左侧表单
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>

        <!-- 素养评分配置 (简化版) -->
        <el-divider>选择素养考核维度</el-divider>
        <div class="scoring-config-tip">
          <el-alert 
            :title="isDimensionLocked ? '维度定义已由管理员锁定，如需修改请联系系统管理员。' : '请勾选该课程涉及的素养维度。课程产生的所有得分将自动均分给选中的维度。'" 
            :type="isDimensionLocked ? 'warning' : 'info'" 
            :closable="false" 
            show-icon 
          />
        </div>
        
        <div class="dimension-checkbox-wrap">
          <el-checkbox-group v-model="selectedDimensions" :disabled="isDimensionLocked">
            <el-checkbox v-for="dim in dimensionList" :key="dim.key" :value="dim.key" border class="dim-checkbox">
              {{ dim.name }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="editSubmitting" @click="handleEditCourse">保存设置</el-button>
      </template>
    </el-dialog>

    <!-- 添加章节对话框 -->
    <el-dialog v-model="showAddChapterDialog" title="添加章节" width="400px" @closed="resetChapterForm">
      <el-form :model="chapterForm" label-width="80px" size="large" @submit.prevent="handleCreateChapter">
        <el-form-item label="父级章节">
          <el-select v-model="chapterForm.parentId" placeholder="作为一级章节 (默认)" clearable style="width: 100%">
            <el-option label="-- 作为一级章节 --" value="" />
            <el-option v-for="c in chapters" :key="c.id" :label="c.chapterName" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="chapterForm.chapterName" placeholder="输入章节标题" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddChapterDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="chapterSubmitting" @click="handleCreateChapter">保存</el-button>
      </template>
    </el-dialog>

    <!-- 创建任务对话框 -->
    <el-dialog v-model="showCreateTaskDialog" title="创建学习任务" width="520px" @closed="resetTaskForm">
      <el-form :model="taskForm" label-width="80px" size="large">
        <el-form-item label="任务名称" required>
          <el-input v-model="taskForm.taskTitle" placeholder="如：第一章课后测试" clearable />
        </el-form-item>
        <el-form-item label="任务类型" required>
          <el-select v-model="taskForm.taskType" placeholder="选择任务类型" style="width: 100%">
            <el-option label="作业" :value="1" />
            <el-option label="测验" :value="2" />
            <el-option label="考试" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="满分设置">
          <el-input-number v-model="taskForm.totalScore" :min="0" :max="100" />
        </el-form-item>
        <template v-if="taskForm.taskType !== 1">
          <el-form-item label="开始时间" required>
            <el-date-picker
              v-model="taskForm.startTime"
              type="datetime"
              placeholder="选择测试/考试开始时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="截止时间" required>
            <el-date-picker
              v-model="taskForm.endTime"
              type="datetime"
              placeholder="选择测试/考试截止时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </template>
        <el-form-item label="任务说明">
          <el-input v-model="taskForm.taskDescription" type="textarea" :rows="3" placeholder="填写要求或注意事项" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateTaskDialog = false">取消</el-button>
        <el-button type="primary" class="red-confirm-btn" :loading="taskSubmitting" @click="handleCreateTask">发布任务</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getCourseDetail,
  updateCourse,
  getMyCourses,
  joinCourse,
  quitCourse,
  getChapterTree,
  createChapter,
  getChapterCoursewares,
  createCourseware,
  deleteCourseware,
  uploadCoursewareFile,
  getTaskList,
  createTask,
  deleteTask,
  getAnnouncementList,
  createAnnouncement,
  deleteAnnouncement,
  type CourseItem,
  type ChapterNode,
  type CoursewareItem,
  type TaskItem,
  type AnnouncementItem,
  type ChapterResourceItem,
  bindChapterResource,
  unbindChapterResource,
  submitCourseForReview,
  deleteCourseDraft,
  checkMembership, // Added checkMembership import
} from '@/api/course'
import type { PageResponse } from '@/types/api'
import { getPostList, createPost, type PostItem } from '@/api/community'
import { getResourceList, getCategoryTree, getEnabledTags, type ResourceItem, type CategoryNode, type TagItem } from '@/api/resource'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Reading, User, UserFilled, Edit, Plus, VideoPlay, Document, Headset, FolderOpened,
  Download, Delete, Link, Search, MagicStick, UploadFilled, Upload, Loading, Check
} from '@element-plus/icons-vue'
import { logBehavior } from '@/api/report'
import { analyzeCourseFile, getAiResourceRecommendations, getAiResourceRecommendationsByFile, type AiCourseAnalysisResponse, type AiRecommendationResponse } from '@/api/ai'
import { getAllEnabledSubjects } from '@/api/subject'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const courseId = computed(() => route.params.id as string)

// ───── 课程基本信息 ─────
const pageLoading = ref(false)
const course = ref<CourseItem | null>(null)
const isMember = ref(false)
const joining = ref(false)
const quitting = ref(false)
const showEditDialog = ref(false)

const isMyTeaching = computed(() =>
  authStore.isTeacher && String(course.value?.teacherId) === String(authStore.userInfo?.userId),
)

// ───── AI 辅助相关 ─────
const aiLoading = ref(false)
const aiResult = ref<AiCourseAnalysisResponse | null>(null)
const subjectAreaOptions = ref<string[]>([])
const aiRecommendLoading = ref(false)
const aiRecommendResult = ref<AiRecommendationResponse | null>(null)

async function fetchSubjects() {
  try {
    const res = await getAllEnabledSubjects()
    subjectAreaOptions.value = (res || []).map(item => item.name)
  } catch (error: any) {
    console.error('获取学科分类失败', error)
  }
}

async function handleAiAnalyze(options: any) {
  aiLoading.value = true
  aiResult.value = null
  try {
    const res = await analyzeCourseFile(options.file)
    aiResult.value = res
    ElMessage.success('AI 解析完成，您可以查看建议结果并应用')
  } catch (err: any) {
    ElMessage.error(err.message || 'AI 解析失败')
  } finally {
    aiLoading.value = false
  }
}

function applyAiResult() {
  if (!aiResult.value) return
  const { courseName, courseIntro, subjectArea, suggestedDimensions } = aiResult.value
  if (courseName) editForm.courseName = courseName
  if (courseIntro) editForm.courseIntro = courseIntro
  if (subjectArea && subjectAreaOptions.value.includes(subjectArea)) {
    editForm.subjectArea = subjectArea
  } else if (subjectArea && !subjectAreaOptions.value.includes(subjectArea)) {
    // 如果 AI 识别到一个新的学科，但当前列表没有，可以选择回填至输入框（如果支持的话）
    // 这里我们保守一点，只在匹配时回填，或者在没有信息时直接赋初值
    if (!editForm.subjectArea) editForm.subjectArea = subjectArea
  }
  
  if (suggestedDimensions?.length) {
    selectedDimensions.value = [...new Set([...selectedDimensions.value, ...suggestedDimensions])]
  }
  
  ElMessage.success('解析建议已应用至表单')
}

/** 获取 AI 推荐资源 */
async function fetchAiRecommendations() {
  aiRecommendLoading.value = true
  try {
    const res = await getAiResourceRecommendations(Number(courseId.value))
    aiRecommendResult.value = res
    if (res.recommendations.length === 0) {
      ElMessage.info('AI 暂未发现更合适的推荐资源')
    }
  } catch (err: any) {
    ElMessage.error('推荐失败: ' + (err.message || '服务暂不可用'))
  } finally {
    aiRecommendLoading.value = false
  }
}

const isCourseFinished = computed(() => {
  if (!course.value) return false
  return getCalculatedStatus(course.value) === 'finished'
})

const canInteract = computed(() => {
  if (isCourseFinished.value) return false
  if (authStore.isAdmin) return true
  if (authStore.isTeacher && isMyTeaching.value) return true
  if (!authStore.isTeacher && !authStore.isAdmin && isMember.value) return true
  return false
})

function getCalculatedStatus(c: CourseItem): 'draft' | 'audit' | 'rejected' | 'notStarted' | 'ongoing' | 'finished' {
  if (c.auditStatus === -1) return 'draft'
  if (c.auditStatus === 0) return 'audit'
  if (c.auditStatus === 2) return 'rejected'
  const now = new Date()
  if (c.startTime && new Date(c.startTime) > now) return 'notStarted'
  if (c.endTime && new Date(c.endTime) < now) return 'finished'
  return 'ongoing'
}

function statusType(c: CourseItem): undefined | 'info' | 'success' | 'warning' | 'danger' {
  const s = getCalculatedStatus(c)
  if (s === 'draft') return 'info'
  if (s === 'audit') return 'warning'
  if (s === 'rejected') return 'danger'
  if (s === 'notStarted') return 'info'
  if (s === 'ongoing') return 'success'
  if (s === 'finished') return 'info'
  return undefined
}

function statusLabel(c: CourseItem): string {
  const s = getCalculatedStatus(c)
  if (s === 'draft') return '草稿'
  if (s === 'audit') return '审核中'
  if (s === 'rejected') return '已拒绝'
  if (s === 'notStarted') return '暂未开放'
  if (s === 'ongoing') return '进行中'
  if (s === 'finished') return '已结课'
  return '未知'
}

// ───── 操作处理 ─────
function joinTypeLabel(t: number): string { return ({ 1: '公开加入', 2: '审批加入' } as Record<number, string>)[t] ?? '' }

async function handleJoin() {
  joining.value = true
  try {
    await joinCourse(courseId.value)
    isMember.value = true
    ElMessage.success('加入成功！')
    if (course.value) {
      course.value.studentCount = (course.value.studentCount ?? course.value.memberCount ?? 0) + 1
      course.value.memberCount = course.value.studentCount
    }
  } finally { joining.value = false }
}

async function handleQuit() {
  await ElMessageBox.confirm('确定要退出本课程吗？', '提示', { type: 'warning' })
  quitting.value = true
  try {
    await quitCourse(courseId.value)
    isMember.value = false
    ElMessage.success('已退出课程')
    if (course.value) {
      course.value.studentCount = Math.max(0, (course.value.studentCount ?? course.value.memberCount ?? 1) - 1)
      course.value.memberCount = course.value.studentCount
    }
  } finally { quitting.value = false }
}

// ───── 课程基本信息编辑 ─────
const editSubmitting = ref(false)
const editForm = reactive({
  id: '',
  courseName: '',
  courseIntro: '',
  courseCover: '',
  subjectArea: '',
  joinType: 1,
  startTime: '',
  endTime: '',
})

// ───── 素养评分配置 ─────
const dimensionList = [
  { key: 'dimension1', name: '知识技能素养' },
  { key: 'dimension2', name: '职业品格素养' },
  { key: 'dimension3', name: '创新实践素养' },
  { key: 'dimension4', name: '社会责任素养' },
  { key: 'dimension5', name: '发展适应素养' },
]

const selectedDimensions = ref<string[]>([])

const isDimensionLocked = computed(() => {
  return course.value?.isDimensionLocked === 1
})

function initEditForm() {
  fetchSubjects() // 确保学科领域列表已加载
  if (course.value) {
    aiResult.value = null // 重置 AI 状态
    Object.assign(editForm, {
      id: courseId.value,
      courseName: course.value.courseName || '',
      courseIntro: course.value.courseIntro || course.value.description || '',
      courseCover: course.value.courseCover || course.value.cover || '',
      subjectArea: course.value.subjectArea || '',
      joinType: course.value.joinType || 1,
      startTime: course.value.startTime || '',
      endTime: course.value.endTime || '',
    })

    // 加载维度选中状态
    if (course.value.dimensionWeights) {
      try {
        const weights = JSON.parse(course.value.dimensionWeights)
        const selected: string[] = []
        Object.keys(weights).forEach(key => {
          if (weights[key] === 1) selected.push(key)
        })
        selectedDimensions.value = selected
      } catch (e) { console.error('Parse dimensionWeights failed', e) }
    } else {
      selectedDimensions.value = []
    }
  }
}

const coverUploading = ref(false)

async function handleUploadCover(options: any) {
  coverUploading.value = true
  try {
    const res = await uploadCoursewareFile('cover', options.file)
    // 根据 FileUploadResult 接口，返回的值包含 fileUrl
    editForm.courseCover = (res as any).fileUrl || (res as any).url || res || ''
    ElMessage.success('封面上传成功')
  } catch (err: any) {
    ElMessage.error(err.message || '封面上传失败')
  } finally {
    coverUploading.value = false
  }
}

async function handleEditCourse() {
  if (!editForm.courseName.trim()) { ElMessage.warning('课程名称不能为空'); return }
  if (!editForm.startTime) { ElMessage.warning('开课时间不能为空'); return }
  
  editSubmitting.value = true
  try {
    const weights: Record<string, number> = {}
    selectedDimensions.value.forEach(dim => { weights[dim] = 1 })

    await updateCourse({
      id: courseId.value,
      courseName: editForm.courseName,
      courseIntro: editForm.courseIntro, 
      courseCover: editForm.courseCover,
      subjectArea: editForm.subjectArea,
      joinType: editForm.joinType,
      schoolId: authStore.userInfo?.schoolId ?? undefined,
      startTime: editForm.startTime,
      endTime: editForm.endTime || undefined,
      dimensionWeights: JSON.stringify(weights),
      scoringConfig: '{}' // 全局配置，发送空JSON对象以兼容MySQL JSON类型
    })
    ElMessage.success('保存成功')
    showEditDialog.value = false
    // 刷新展示
    course.value = await getCourseDetail(courseId.value)
  } finally {
    editSubmitting.value = false
  }
}

const submittingReview = ref(false)

async function handleSubmitReview() {
  if (!course.value?.courseName) {
    ElMessage.warning('课程名称不能为空，请先编辑信息')
    return
  }
  
  await ElMessageBox.confirm('提交审核后，课程基本信息将锁定，确定提交吗？', '确认提交', {
    type: 'warning',
    confirmButtonText: '确定提交',
    cancelButtonText: '取消'
  })

  submittingReview.value = true
  try {
    await submitCourseForReview(courseId.value)
    ElMessage.success('提交审核成功')
    // 重新加载课程信息以刷新状态
    course.value = await getCourseDetail(courseId.value)
  } catch (err: any) {
    ElMessage.error(err.message || '提交失败')
  } finally {
    submittingReview.value = false
  }
}

async function handleDeleteDraft() {
  await ElMessageBox.confirm('确定要删除这篇课程草稿吗？删除后不可恢复。', '确认删除', {
    type: 'error',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  })

  try {
    await deleteCourseDraft(courseId.value)
    ElMessage.success('草稿已删除')
    router.replace('/course')
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

// ───── Tab ─────
const activeTab = ref('ware')

function onTabChange(tab: any) {
  if (tab.paneName === 'task' && !tasks.value.length) fetchTasks()
  if (tab.paneName === 'discuss' && !posts.value.list.length) fetchPosts()
  if (tab.paneName === 'notice' && !announcements.value.length) fetchAnnouncements()
}

// ───── 章节 & 课件 ─────
const wareLoading = ref(false)
const chapters = ref<ChapterNode[]>([])
const selectedChapterId = ref<string | undefined>(undefined)
const wares = ref<CoursewareItem[]>([])
const showAddChapterDialog = ref(false)
const showAddWareDialog = ref(false)

async function fetchChapters() {
  const result = await getChapterTree(courseId.value)
  chapters.value = result || []
  // 若当前未选中章节，则刷新全局聚合资源
  if (!selectedChapterId.value) {
    aggregateAllResources()
  }
}

/** 递归聚合所有章节的关联资源 */
function aggregateAllResources() {
  const allResources: ChapterResourceItem[] = []
  const collect = (nodes: ChapterNode[]) => {
    for (const node of nodes) {
      if (node.resourceList?.length) {
        allResources.push(...node.resourceList)
      }
      if (node.children?.length) {
        collect(node.children)
      }
    }
  }
  collect(chapters.value)
  // 去重（防止同一资源绑定到多个章节）
  const seenIds = new Set()
  selectedChapterResources.value = allResources.filter(r => {
    if (seenIds.has(r.resourceId)) return false
    seenIds.add(r.resourceId)
    return true
  })
}

async function fetchWares(chapterId?: string) {
  wareLoading.value = true
  try {
    const res = await getChapterCoursewares(courseId.value as string, chapterId)
    wares.value = res?.list || res?.records || []
  } catch {
    wares.value = []
  } finally { wareLoading.value = false }
}

function handleChapterClick(data: ChapterNode) {
  selectedChapterId.value = selectedChapterId.value === data.id ? undefined : data.id
  if (selectedChapterId.value) {
    selectedChapterResources.value = data.resourceList || []
  } else {
    // 聚合全课关联资源
    aggregateAllResources()
  }
  fetchWares(selectedChapterId.value)
}

// ===================== 章节关联资源管理 =====================
const selectedChapterResources = ref<ChapterResourceItem[]>([])
const showBindResourceDialog = ref(false)
const bindResourceLoading = ref(false)
const availableResources = ref<ResourceItem[]>([])
const resourceQueryTotal = ref(0)
const categoryTree = ref<CategoryNode[]>([])
const tagList = ref<TagItem[]>([])

const resourceQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  resourceType: undefined as number | undefined,
  categoryId: undefined as string | undefined,
  tagId: undefined as string | undefined,
  status: 2 // 仅查询已发布资源
})

async function openBindResourceDialog() {
  if (!selectedChapterId.value) {
    ElMessage.warning('请先在左侧选择具体章节')
    return
  }
  showBindResourceDialog.value = true
  if (categoryTree.value.length === 0) {
    try {
      categoryTree.value = await getCategoryTree()
      tagList.value = await getEnabledTags()
    } catch {}
  }
  fetchAvailableResources()
  fetchAiRecommendations()
}


async function fetchAvailableResources() {
  bindResourceLoading.value = true
  try {
    const res = await getResourceList(resourceQuery)
    availableResources.value = res.list || res.records || []
    resourceQueryTotal.value = res.total || 0
  } catch (error) {
    ElMessage.error('获取资源列表失败')
  } finally {
    bindResourceLoading.value = false
  }
}

function handleResourcePageChange(val: number) {
  resourceQuery.pageNum = val
  fetchAvailableResources()
}

function handleResourceRowClick(row: ResourceItem) {
  window.open(`/#/resource/${row.id}`, '_blank')
}

function isResourceBound(resourceId: string) {
  return selectedChapterResources.value.some(r => r.resourceId === resourceId)
}

async function toggleBindResource(res: ResourceItem) {
  if (!selectedChapterId.value) return
  if (!courseId.value) return
  
  const cid = courseId.value as string
  const chid = selectedChapterId.value
  
  try {
    if (isResourceBound(res.id)) {
      // 解绑
      await unbindChapterResource(cid, chid, res.id)
      selectedChapterResources.value = selectedChapterResources.value.filter(r => r.resourceId !== res.id)
      ElMessage.success('已取消关联')
    } else {
      // 绑定
      await bindChapterResource(cid, chid, res.id)
      ElMessage.success('关联成功')
      // 局部刷新或重载章节树，这里简单往本地数组插入假数据模拟刷新，之后再全量 fetchChapters 稳妥
      fetchChapters().then(() => {
        // 恢复选中状态
        const findNode = (nodes: ChapterNode[]): ChapterNode | undefined => {
          for (const node of nodes) {
            if (node.id === chid) return node
            if (node.children?.length) {
              const childNode = findNode(node.children)
              if (childNode) return childNode
            }
          }
          return undefined
        }
        const curr = findNode(chapters.value)
        if (curr) {
          selectedChapterResources.value = curr.resourceList || []
        }
      })
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function handleAiRecommendByFile(options: any) {
  const file = options.file
  if (!file) return
  
  aiRecommendLoading.value = true
  try {
    const res = await getAiResourceRecommendationsByFile(file)
    aiRecommendResult.value = res
    ElMessage.success('文档分析完成，已为您推荐相关资源')
  } catch (err: any) {
    ElMessage.error(err.message || '分析文档推荐失败')
  } finally {
    aiRecommendLoading.value = false
  }
}

function openChapterResource(res: ChapterResourceItem) {
  // 统一跳转至资源详情页供在线预览，避免直接 window.open 触发附件自动下载
  router.push(`/resource/${res.resourceId}`)
}

const chapterForm = reactive({
  chapterName: '',
  parentId: ''
})
const chapterSubmitting = ref(false)

function resetChapterForm() {
  Object.assign(chapterForm, { chapterName: '', parentId: '' })
}

async function handleCreateChapter() {
  if (!chapterForm.chapterName.trim()) { ElMessage.warning('章节标题不能为空'); return }
  chapterSubmitting.value = true
  try {
    const payload: any = { chapterName: chapterForm.chapterName }
    if (chapterForm.parentId) payload.parentId = chapterForm.parentId
    
    await createChapter(courseId.value, payload)
    ElMessage.success('章节添加成功')
    showAddChapterDialog.value = false
    resetChapterForm()
    fetchChapters()
  } finally {
    chapterSubmitting.value = false
  }
}

function wareIcon(type: number) {
  return { 1: markRaw(VideoPlay), 2: markRaw(Document), 3: markRaw(Document), 4: markRaw(Headset) }[type] ?? markRaw(Document)
}

function wareAuditType(status: number): '' | 'info' | 'success' | 'warning' | 'danger' {
  return ({ 0: 'warning', 1: 'success', 2: 'danger' } as Record<number, '' | 'info' | 'success' | 'warning' | 'danger'>)[status] ?? 'info'
}

function wareAuditLabel(status: number): string {
  return ({ 0: '待审核', 1: '已通过', 2: '已拒绝' } as Record<number, string>)[status] ?? '—'
}

function openWare(w: CoursewareItem) {
  if (w.fileUrl) {
    const isOfficeFile = w.wareType === 3 || w.fileUrl.endsWith('.ppt') || w.fileUrl.endsWith('.pptx') || w.fileUrl.endsWith('.doc') || w.fileUrl.endsWith('.docx') || w.fileUrl.endsWith('.xls') || w.fileUrl.endsWith('.xlsx');
    if (isOfficeFile && w.fileUrl.startsWith('http')) {
      // 微软官方的在线文档预览服务（要求文件 URL 是公网可访问的）
      window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(w.fileUrl)}`, '_blank')
    } else {
      window.open(w.fileUrl, '_blank')
    }
  }
  // 学生行为埋点：上报观看课件行为
  if (!authStore.isTeacher && !authStore.isAdmin && authStore.userInfo?.userId) {
    const behaviorType = w.wareType === 1 ? 'WATCH_VIDEO' : 'READ_DOC'
    logBehavior({
      userId: authStore.userInfo.userId,
      courseId: courseId.value,
      behaviorType: behaviorType as 'WATCH_VIDEO' | 'READ_DOC',
      behaviorObjectId: w.id,
    }).catch(() => { /* 埋点静默失败，不影响主流程 */ })
  }
}

function downloadWare(w: CoursewareItem) {
  if (w.fileUrl) {
    const link = document.createElement('a')
    link.href = w.fileUrl
    link.download = w.wareTitle || 'courseware'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

async function deleteWareById(id: string) {
  await ElMessageBox.confirm('确定删除该课件吗？', '提示', { type: 'warning' })
  await deleteCourseware(id)
  wares.value = wares.value.filter((w) => w.id !== id)
  ElMessage.success('已删除')
}

// ───── 上传课件逻辑 ─────
const wareSubmitting = ref(false)
const uploadingFile = ref(false)
const wareFileList = ref<any[]>([])
const wareForm = reactive({
  wareTitle: '',
  wareType: 2 as 1|2|3|4,
  allowDownload: 1,
  description: '',
  fileUrl: '',
  fileSize: 0,
  duration: 0,
  chapterId: '' as string | undefined
})

function resetWareForm() {
  Object.assign(wareForm, { wareTitle: '', wareType: 2, allowDownload: 1, description: '', fileUrl: '', fileSize: 0, duration: 0, chapterId: undefined })
  wareFileList.value = []
}

function openAddWareDialog() {
  if (!selectedChapterId.value) {
    ElMessage.warning('请先在左侧选择具体章节')
    return
  }
  resetWareForm()
  wareForm.chapterId = selectedChapterId.value
  showAddWareDialog.value = true
}

async function handleUploadWare(options: any) {
  const file = options.file
  if (!file) return
  
  const typeMap: Record<number, 'video'|'pdf'|'ppt'|'audio'> = { 1: 'video', 2: 'pdf', 3: 'ppt', 4: 'audio' }
  const uploadType = typeMap[wareForm.wareType] || 'pdf'
  
  uploadingFile.value = true
  try {
    const res = await uploadCoursewareFile(uploadType, file)
    wareForm.fileUrl = (res as any).fileUrl || (res as any).url || ''
    wareForm.fileSize = file.size || 0
    ElMessage.success('文件上传成功')
  } catch (err: any) {
    ElMessage.error(err.message || '文件上传失败')
    wareFileList.value = []
    wareForm.fileUrl = ''
  } finally {
    uploadingFile.value = false
  }
}

async function handleCreateWare() {
  if (!wareForm.wareTitle.trim()) { ElMessage.warning('请输入课件标题'); return }
  if (!wareForm.fileUrl) { ElMessage.warning('请先上传课件文件'); return }
  
  wareSubmitting.value = true
  try {
    await createCourseware(courseId.value, { 
      ...wareForm, 
      chapterId: wareForm.chapterId || selectedChapterId.value 
    })
    ElMessage.success('课件上传成功，等待审核或已发布')
    showAddWareDialog.value = false
    resetWareForm()
    fetchWares(selectedChapterId.value)
    if (course.value) course.value.coursewareCount++
  } finally { 
    wareSubmitting.value = false 
  }
}

// ───── 任务 ─────
const taskLoading = ref(false)
const tasks = ref<TaskItem[]>([])
const showCreateTaskDialog = ref(false)
const taskSubmitting = ref(false)
const taskForm = reactive({
  taskTitle: '',
  taskType: 1 as 1|2|3,
  totalScore: 100,
  startTime: '',
  endTime: '',
  taskDescription: '',
})

function resetTaskForm() {
  Object.assign(taskForm, { taskTitle: '', taskType: 1, totalScore: 100, startTime: '', endTime: '', taskDescription: '' })
}

function taskStatusType(s: number): '' | 'info' | 'success' | 'warning' { return ({ 0: 'info', 1: 'success', 2: 'warning' } as Record<number, '' | 'info' | 'success' | 'warning'>)[s] ?? 'info' }
function taskStatusLabel(s: number): string { return ({ 0: '草稿', 1: '进行中', 2: '已结束' } as Record<number, string>)[s] ?? '—' }

async function fetchTasks() {
  taskLoading.value = true
  try {
    const res = await getTaskList(courseId.value, { pageSize: 50 })
    tasks.value = res?.list || res?.records || []
  } finally { taskLoading.value = false }
}

async function deleteTaskById(id: string) {
  await ElMessageBox.confirm('确定删除该任务吗？', '提示', { type: 'warning' })
  await deleteTask(courseId.value, id)
  tasks.value = tasks.value.filter((t) => t.id !== id)
  ElMessage.success('已删除')
}

async function handleCreateTask() {
  if (!taskForm.taskTitle.trim()) { ElMessage.warning('任务名称不能为空'); return }
  if (taskForm.taskType !== 1) {
    if (!taskForm.startTime) { ElMessage.warning('测验/考试的开始时间不能为空'); return }
    if (!taskForm.endTime) { ElMessage.warning('测验/考试的截止时间不能为空'); return }
  }
  taskSubmitting.value = true
  try {
    const payload = { ...taskForm, courseId: courseId.value, status: 1 } // 默认立即发布
    // 作业类型不传空字符串的时间，避免后端 LocalDateTime 解析报错
    if (payload.taskType === 1) {
      delete (payload as any).startTime
      delete (payload as any).endTime
    }
    await createTask(courseId.value, payload)
    ElMessage.success('任务发布成功')
    showCreateTaskDialog.value = false
    resetTaskForm()
    fetchTasks()
    if (course.value) course.value.taskCount = (course.value.taskCount || 0) + 1
  } finally {
    taskSubmitting.value = false
  }
}

// 临时测试功能：手动完成任务并计分
async function handleCompleteTestTask(task: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入该任务的测试得分 (0-' + (task.totalScore || 100) + ')', '临时测试：完成任务', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^\d+(\.\d+)?$/,
      inputErrorMessage: '请输入数字分值'
    })

    if (value === null || value === '') return

    const score = parseFloat(value)
    if (score > (task.totalScore || 100)) {
      return ElMessage.warning('得分不能超过总分')
    }

    await logBehavior({
      courseId: course.value.id,
      behaviorType: 'SUBMIT_TASK',
      behaviorObjectId: task.id,
      behaviorData: JSON.stringify({
        score: score,
        total: task.totalScore || 100,
        taskTitle: task.taskTitle
      })
    })

    ElMessage.success('任务完成行为上报成功！素养得分已触发重计。')
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Report task behavior failed:', err)
      ElMessage.error('上报失败')
    }
  }
}

// ───── 讨论话题 ─────
const postLoading = ref(false)
const posts = ref<PageResponse<PostItem>>({ list: [], total: 0, pageNum: 1, pageSize: 10 })
const postQuery = reactive({ pageNum: 1, pageSize: 10 })
const showCreatePostDialog = ref(false)
const postSubmitting = ref(false)

function handlePostClick(postId: string) {
  if (!canInteract.value) {
    if (isCourseFinished.value) {
      ElMessage.warning('该课程已经结课，讨论不可再互动')
    } else {
      ElMessage.warning('请先加入课程再参与讨论')
    }
    return
  }
  router.push(`/community/topic/${postId}`)
}
const postForm = reactive({ postTitle: '', postContent: '' })

async function fetchPosts() {
  postLoading.value = true
  try {
    const res = await getPostList({ courseId: courseId.value, ...postQuery })
    posts.value = { ...res, list: res?.list || res?.records || [] }
  } finally { postLoading.value = false }
}

async function handleCreatePost() {
  if (!postForm.postTitle.trim()) { ElMessage.warning('请输入话题标题'); return }
  postSubmitting.value = true
  try {
    await createPost({ courseId: courseId.value, postTitle: postForm.postTitle, postContent: postForm.postContent })
    ElMessage.success('发布成功')
    showCreatePostDialog.value = false
    Object.assign(postForm, { postTitle: '', postContent: '' })
    fetchPosts()
  } finally { postSubmitting.value = false }
}

// ───── 公告 ─────
const noticeLoading = ref(false)
const announcements = ref<AnnouncementItem[]>([])
const showCreateNoticeDialog = ref(false)
const noticeSubmitting = ref(false)
const noticeForm = reactive({ title: '', content: '', isTop: 0 })
const noticeDialogVisible = ref(false)
const selectedNotice = ref<AnnouncementItem | null>(null)

async function fetchAnnouncements() {
  noticeLoading.value = true
  try {
    const res = await getAnnouncementList(courseId.value, { pageSize: 50 })
    announcements.value = res?.list || res?.records || []
  } finally { noticeLoading.value = false }
}

function openNotice(n: AnnouncementItem) {
  selectedNotice.value = n
  noticeDialogVisible.value = true
}

async function handleCreateNotice() {
  if (!noticeForm.title.trim()) { ElMessage.warning('请输入公告标题'); return }
  if (!noticeForm.content.trim()) { ElMessage.warning('请输入公告内容'); return }
  noticeSubmitting.value = true
  try {
    await createAnnouncement(courseId.value, { ...noticeForm, courseId: courseId.value })
    ElMessage.success('公告发布成功')
    showCreateNoticeDialog.value = false
    Object.assign(noticeForm, { title: '', content: '', isTop: 0 })
    fetchAnnouncements()
  } finally { noticeSubmitting.value = false }
}

async function deleteNoticeById(id: string) {
  noticeDialogVisible.value = false
  await ElMessageBox.confirm('确定删除该公告吗？', '提示', { type: 'warning' })
  await deleteAnnouncement(courseId.value, id)
  announcements.value = announcements.value.filter((n) => n.id !== id)
  ElMessage.success('已删除')
}

// ───── 初始化 ─────
onMounted(async () => {
  pageLoading.value = true
  try {
    const [detail] = await Promise.all([
      getCourseDetail(courseId.value),
      fetchChapters(),
      fetchWares(),
      fetchAnnouncements(),
    ])
    course.value = detail

    // 教师/管理员不涉及加入退出，学生通过 getMyCourses 判断是否已加入
    if (!authStore.isTeacher && !authStore.isAdmin) {
      try {
        const myData = await getMyCourses()
        const joined = myData.learning ?? []
        isMember.value = joined.some((c: any) => String(c.courseId ?? c.id) === courseId.value)
      } catch {
        isMember.value = false
      }
    }
    
    // 弹出全局系统提示
    if (isCourseFinished.value) {
      ElMessage.warning('该课程已经结课')
    }
  } finally {
    pageLoading.value = false
  }
})
</script>

<style scoped>
/* ===== 课程头部 ===== */
.course-hero {
  display: flex;
  gap: 24px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  margin-bottom: 20px;
}

.hero-cover {
  width: 320px;
  height: 180px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.hero-cover img { width: 100%; height: 100%; object-fit: cover; }

.hero-info { padding: 24px; flex: 1; }

.hero-badges { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }

.hero-title { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #263238; }

.hero-desc { margin: 0 0 12px; font-size: 14px; color: #546e7a; line-height: 1.6; }

.hero-meta { display: flex; gap: 20px; font-size: 13px; color: #78909c; margin-bottom: 16px; }
.hero-meta .el-icon { vertical-align: middle; margin-right: 4px; }

.join-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 8px !important;
}

/* ===== Tabs ===== */
.content-tabs {
  background: #fff;
  border-radius: 16px;
  padding: 0 24px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
}

:deep(.el-tabs__item.is-active) { color: #d32f2f; }
:deep(.el-tabs__active-bar) { background: #d32f2f; }
:deep(.el-tabs__item:hover) { color: #d32f2f; }
:deep(.el-tabs__header) { padding-top: 4px; }

/* ===== 工具栏 ===== */
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.toolbar-total { font-size: 13px; color: #90a4ae; }

.red-sm-btn {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
  border-radius: 6px !important;
}

/* ===== 课件布局 ===== */
.ware-layout { display: flex; gap: 20px; min-height: 300px; }

.chapter-tree {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #f5f5f5;
  padding-right: 16px;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #455a64;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.tree-empty { font-size: 13px; color: #b0bec5; text-align: center; padding: 20px 0; }

.custom-chapter-tree {
  background: transparent;
  color: #546e7a;
}
:deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: all 0.2s;
}
:deep(.el-tree-node__content:hover) {
  background: #fff8f8;
}
:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: #ffebee;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  width: 100%;
}
.custom-tree-node.active { color: #d32f2f; font-weight: 600; }
.custom-tree-node .el-icon { color: #d32f2f; font-size: 14px; }

.ware-list-wrap { flex: 1; min-width: 0; }

.ware-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #455a64;
  margin-bottom: 12px;
}

.ware-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}
.ware-item:hover { border-color: #ffcdd2; background: #fff8f8; }

.ware-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.type-1 { background: #fce4ec; color: #d32f2f; }
.type-2 { background: #e3f2fd; color: #1976d2; }
.type-3 { background: #e8f5e9; color: #388e3c; }
.type-4 { background: #fff3e0; color: #f57c00; }

.ware-title { font-size: 14px; font-weight: 600; color: #263238; }
.ware-meta  { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12px; color: #90a4ae; }
.ware-progress { display: flex; align-items: center; gap: 6px; }
.progress-text { font-size: 11px; color: #90a4ae; }

.ware-empty { padding: 20px 0; }

/* ===== 任务列表 ===== */
.task-list { display: flex; flex-direction: column; gap: 10px; }

.task-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}

.task-type-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.task-type-1 { background: #ffebee; color: #d32f2f; }
.task-type-2 { background: #e3f2fd; color: #1976d2; }
.task-type-3 { background: #e8f5e9; color: #388e3c; }

.task-name { font-size: 14px; font-weight: 600; color: #263238; margin-bottom: 4px; }
.task-meta { display: flex; gap: 12px; align-items: center; font-size: 12px; color: #90a4ae; }
.task-actions { margin-left: auto; flex-shrink: 0; }

/* ===== 讨论帖子 ===== */
.post-list { display: flex; flex-direction: column; gap: 10px; }

.post-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.post-item:hover { border-color: #ffcdd2; background: #fff8f8; }

.post-content { flex: 1; min-width: 0; }
.post-title { font-size: 14px; font-weight: 600; color: #263238; display: flex; align-items: center; gap: 6px; }
.post-meta { font-size: 12px; color: #90a4ae; margin-top: 4px; }
.top-tag { margin-right: 4px; }
.post-stats { display: flex; gap: 12px; font-size: 12px; color: #90a4ae; flex-shrink: 0; }
.post-stats span { display: flex; align-items: center; gap: 4px; }

/* ===== 公告 ===== */
.notice-list { display: flex; flex-direction: column; gap: 12px; }

.notice-item-card {
  padding: 16px 20px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.notice-item-card:hover { border-color: #ffcdd2; background: #fff8f8; }

.notice-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.notice-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #263238; }
.notice-time { font-size: 12px; color: #90a4ae; }
.notice-preview { margin: 0; font-size: 13px; color: #546e7a; line-height: 1.6; }

.notice-full-content { font-size: 14px; color: #37474f; line-height: 1.8; white-space: pre-wrap; }

/* ===== 确认按钮 ===== */
/* ===== 对话框内计分配置 ===== */
.scoring-config-tip { margin-bottom: 16px; }
.dimension-checkbox-wrap {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}
:deep(.el-checkbox-group) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
}
.dim-checkbox {
  margin: 0 !important;
  width: 100%;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}
.dim-checkbox:hover { border-color: #ffcdd2; background: #fff8f8; }
:deep(.el-checkbox.is-bordered.is-checked) {
  border-color: #d32f2f;
  background: #ffebee;
}
:deep(.el-checkbox.is-bordered.is-checked .el-checkbox__label) { color: #d32f2f; font-weight: 600; }
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) { background-color: #d32f2f; border-color: #d32f2f; }

:deep(.red-confirm-btn) {
  background: linear-gradient(135deg, #ff5252, #d32f2f) !important;
  border: none !important;
}

/* ===== 封面上传组件样式 ===== */
.cover-uploader { width: 100%; }
:deep(.cover-uploader .el-upload) {
  width: 100%;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
  height: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fafafa;
}
:deep(.cover-uploader .el-upload:hover) { border-color: #ff5252; }
.cover-placeholder { display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%; color: #8c939d; }
.cover-uploader-icon { font-size: 28px; color: #8c939d; }
.cover-preview { position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
.cover-image { max-width: 100%; max-height: 100%; object-fit: contain; }
.cover-edit-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4); display: flex; justify-content: center; align-items: center;
  color: #fff; opacity: 0; font-size: 24px; transition: opacity 0.2s;
}
.cover-preview:hover .cover-edit-mask { opacity: 1; }
</style>

<style scoped>
/* AI 辅助弹窗样式 */
.ai-dialog :deep(.el-dialog__body) { padding: 20px 30px; }
.form-section { border-right: 1px solid #efefef; }
.ai-panel { background: #fcfcfc; border-radius: 12px; padding: 20px; border: 1px dashed #d32f2f44; }
.ai-title { font-size: 16px; font-weight: 700; color: #d32f2f; margin-bottom: 12px; display: flex; align-items: center; }
.ai-tip { font-size: 13px; color: #78909c; margin-bottom: 20px; line-height: 1.6; }
.ai-uploader :deep(.el-upload-dragger) { border-width: 2px; }
.ai-loading-box { padding: 20px 0; color: #d32f2f; text-align: center; }
.ai-loading-box p { margin-top: 10px; font-size: 13px; }
.ai-result-preview { margin-top: 20px; animation: fadeInUp 0.5s; }
.suggest-item { margin-bottom: 12px; }
.suggest-item .label { font-size: 12px; color: #546e7a; margin-bottom: 6px; font-weight: 600; }
.suggest-item .tags { display: flex; flex-wrap: wrap; gap: 6px; }
.suggest-item .val { font-size: 13px; color: #263238; }

/* 资源推荐样式 */
.ai-recommend-section { margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
.recommend-list { max-height: 240px; overflow-y: auto; padding: 10px 0; }
.recommend-card { 
  display: flex; align-items: center; justify-content: space-between; 
  padding: 12px; background: #f9f9f9; border-radius: 8px; margin-bottom: 10px;
  border-left: 4px solid #d32f2f;
}
.recommend-info { flex: 1; margin-right: 16px; }
.recommend-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.rec-title { font-weight: 600; font-size: 14px; color: #263238; }
.rec-reason { font-size: 12px; color: #78909c; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
