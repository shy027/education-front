import { ref, reactive } from 'vue'

interface PaginationState {
  pageNum: number
  pageSize: number
  total: number
}

/** 分页状态管理 hook */
export function usePagination(defaultPageSize = 10) {
  const pagination = reactive<PaginationState>({
    pageNum: 1,
    pageSize: defaultPageSize,
    total: 0,
  })

  const loading = ref(false)

  function setTotal(total: number) {
    pagination.total = total
  }

  function reset() {
    pagination.pageNum = 1
    pagination.total = 0
  }

  function handlePageChange(page: number) {
    pagination.pageNum = page
  }

  function handleSizeChange(size: number) {
    pagination.pageSize = size
    pagination.pageNum = 1
  }

  return {
    pagination,
    loading,
    setTotal,
    reset,
    handlePageChange,
    handleSizeChange,
  }
}
