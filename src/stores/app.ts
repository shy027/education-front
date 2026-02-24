import { defineStore } from 'pinia'

interface AppState {
  sidebarCollapsed: boolean
  globalLoading: boolean
  pageTitle: string
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: false,
    globalLoading: false,
    pageTitle: '课程思政融合育人平台',
  }),

  actions: {
    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    setSidebarCollapsed(val: boolean): void {
      this.sidebarCollapsed = val
    },
    setPageTitle(title: string): void {
      this.pageTitle = title
      document.title = title ? `${title} - 育人平台` : '课程思政融合育人平台'
    },
    setGlobalLoading(val: boolean): void {
      this.globalLoading = val
    },
  },

  persist: {
    key: 'edu-app',
    storage: localStorage,
    pick: ['sidebarCollapsed'],
  },
})
