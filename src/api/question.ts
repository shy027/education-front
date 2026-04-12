import { get, post, put, del, upload } from '@/utils/request'
import type { PageQuery, PageResponse } from '@/types/api'

export interface QuestionOption {
  id?: string
  optionLabel: string
  content: string
  isCorrect: boolean
  sortOrder: number
}

export interface QuestionItem {
  id?: string
  courseId?: string
  chapterId?: string
  questionType: number
  content: string
  score?: number
  difficulty: number
  options?: QuestionOption[]
  correctAnswer?: string
  referenceAnswer?: string
  analysis?: string
  categoryId?: string
  dimensions?: string
}

export interface QuestionQuery extends PageQuery {
  courseId?: string
  chapterId?: string
  questionType?: number
  difficulty?: number
  keyword?: string
  categoryId?: string
  dimensions?: string[]  // Frontend arrays will be joined into string by axios, or we should define dimensions as string
}

export const getQuestionList = (params: QuestionQuery) => {
  const query = { ...params }
  if (Array.isArray(query.dimensions) && query.dimensions.length > 0) {
    query.dimensions = (query.dimensions as string[]).join(',')
  } else {
    delete query.dimensions // omit if empty array
  }
  return get<PageResponse<QuestionItem>>('/v1/questions', query as any)
}

export const getQuestionDetail = (id: string) =>
  get<QuestionItem>(`/v1/questions/${id}`)

export const createQuestion = (data: QuestionItem) =>
  post<string>('/v1/questions', data)

export const updateQuestion = (id: string, data: QuestionItem) =>
  put<void>(`/v1/questions/${id}`, data)

export const deleteQuestion = (id: string) =>
  del<void>(`/v1/questions/${id}`)

export const downloadTemplate = async () => {
    // 从 localStorage 读取 token 用于鉴权
    let token: string | null = null
    try {
        const raw = localStorage.getItem('edu-auth')
        if (raw) token = JSON.parse(raw)?.token ?? null
    } catch { /* ignore */ }

    const headers: HeadersInit = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch('/api/v1/questions/template', { headers })
    if (!res.ok) throw new Error('下载失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '题目导入模板.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export const importQuestions = (file: File, courseId?: string) => {
  const form = new FormData()
  form.append('file', file)
  const url = courseId ? `/v1/questions/import?courseId=${courseId}` : '/v1/questions/import'
  return upload<void>(url, form)
}

export const recommendQuestions = (count: number, courseId?: string, categoryId?: string, dimensions?: string) =>
  get<QuestionItem[]>('/v1/questions/recommend', { count, courseId, categoryId, dimensions })
