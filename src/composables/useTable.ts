import { ref, reactive, onMounted, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { PageParams, PageResult } from '@/api/types'

interface UseTableOptions<T, Q extends PageParams> {
  /** 数据获取方法 */
  fetchFn: (params: Q) => Promise<PageResult<T>>
  /** 默认分页大小 */
  defaultPageSize?: number
  /** 是否立即加载 */
  immediate?: boolean
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

export function useTable<T, Q extends PageParams>(options: UseTableOptions<T, Q>) {
  const { fetchFn, defaultPageSize = 10, immediate = true } = options

  // 状态
  const loading = ref(false)
  const data = ref<T[]>([]) as Ref<T[]>
  const pagination = reactive<Pagination>({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
  })
  const queryParams = ref<Partial<Q>>({}) as Ref<Partial<Q>>

  // 计算分页参数
  const pageParams: ComputedRef<PageParams> = computed(() => ({
    index: pagination.page - 1, // 后端从 0 开始
    pageSize: pagination.pageSize,
  }))

  // 加载数据
  const loadData = async (extraParams?: Partial<Q>): Promise<void> => {
    loading.value = true
    try {
      const result = await fetchFn({
        ...pageParams.value,
        ...queryParams.value,
        ...extraParams,
      } as Q)
      data.value = result.data
      pagination.total = result.totalItems
    } finally {
      loading.value = false
    }
  }

  // 分页变更
  const onPageChange = (page: number): void => {
    pagination.page = page
    loadData()
  }

  // 每页条数变更
  const onSizeChange = (size: number): void => {
    pagination.pageSize = size
    pagination.page = 1
    loadData()
  }

  // 重置查询
  const reset = (): void => {
    pagination.page = 1
    queryParams.value = {}
    loadData()
  }

  // 刷新（保持当前页）
  const refresh = (): void => {
    loadData()
  }

  // 更新查询参数
  const setQueryParams = (params: Partial<Q>): void => {
    queryParams.value = { ...queryParams.value, ...params }
  }

  // 立即加载
  if (immediate) {
    onMounted(() => loadData())
  }

  return {
    // 状态
    loading,
    data,
    pagination,
    queryParams,
    pageParams,

    // 方法
    loadData,
    onPageChange,
    onSizeChange,
    reset,
    refresh,
    setQueryParams,
  }
}
