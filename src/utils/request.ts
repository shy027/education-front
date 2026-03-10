import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/api'

// 创建 axios 实例
const service = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 获取 token（延迟导入避免循环依赖）
function getToken(): string | null {
  try {
    const raw = localStorage.getItem('edu-auth')
    if (!raw) return null
    const store = JSON.parse(raw)
    return store?.token ?? null
  } catch {
    return null
  }
}

// 请求拦截器 —— 注入 token
service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers!['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器 —— 统一解包 & 错误处理
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    if (res.code === 200) {
      return res.data as never
    }
    // 业务错误：若调用方标记静默则不弹窗
    if (!(response.config as any).skipErrorMsg) {
      ElMessage.error(res.message || '操作失败')
    }
    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.message
    const skip = (error.config as any)?.skipErrorMsg

    if (status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('edu-auth')
      window.location.hash = '#/login'
    } else if (status === 403) {
      if (!skip) ElMessage.error('没有权限执行此操作')
    } else {
      if (!skip) ElMessage.error(msg || error.message || '网络请求失败')
    }
    return Promise.reject(error)
  },
)

/** GET 请求 */
export function get<T = unknown>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
  return service.get(url, { params, ...config }) as Promise<T>
}

/** GET 请求（静默模式，API 失败时不弹全局 toast） */
export function silentGet<T = unknown>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
  return service.get(url, { params, ...config, skipErrorMsg: true } as any) as Promise<T>
}

/** POST 请求 */
export function post<T = unknown>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return service.post(url, data, config) as Promise<T>
}

/** PUT 请求 */
export function put<T = unknown>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return service.put(url, data, config) as Promise<T>
}

/** DELETE 请求 */
export function del<T = unknown>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
  return service.delete(url, { params, ...config }) as Promise<T>
}

/** 上传文件（multipart/form-data） */
export function upload<T = unknown>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
  return service.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  }) as Promise<T>
}

export default service
