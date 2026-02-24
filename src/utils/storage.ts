/** 读取 localStorage */
export function getStorage<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

/** 写入 localStorage */
export function setStorage<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val))
}

/** 删除 localStorage */
export function removeStorage(key: string): void {
  localStorage.removeItem(key)
}

/** 清空所有 localStorage */
export function clearStorage(): void {
  localStorage.clear()
}
