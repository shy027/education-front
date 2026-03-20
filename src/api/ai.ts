import request from '@/utils/request'

/**
 * AI 课程分析接口响应数据结构
 */
export interface AiCourseAnalysisResponse {
  courseName: string      // 新增：课程名称
  courseIntro: string
  subjectArea: string
  suggestedTags: string[]
  suggestedDimensions: string[] // 新增：素养维度 key 列表
  keywords: string[]
}

/**
 * AI 资源推荐响应数据结构
 */
export interface AiRecommendationResponse {
  recommendations: {
    resourceId: number
    title: string
    reason: string
    matchScore: number
  }[]
}

/**
 * 分析课程文档
 * @param file 课程参考文档 (PDF/Word)
 */
export function analyzeCourseFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<AiCourseAnalysisResponse>({
    url: '/v1/ai/course/analyze',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 获取 AI 资源推荐
 * @param courseId 课程 ID
 */
export function getAiResourceRecommendations(courseId: number) {
  return request<AiRecommendationResponse>({
    url: `/v1/ai/course/${courseId}/recommend-resources`,
    method: 'get'
  })
}

/**
 * 通过分析上传的课程文档获取 AI 资源推荐
 * @param file 课程文档 (PDF/Word)
 */
export function getAiResourceRecommendationsByFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<AiRecommendationResponse>({
    url: '/v1/ai/course/recommend-resources/analyze-file',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
