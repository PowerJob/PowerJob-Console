import { ref, watch } from 'vue'
import type { Ref } from 'vue'

export interface UseSearchOptions<T extends Record<string, unknown>> {
  /** 默认值 */
  defaultValues: T
  /** 搜索回调 */
  onSearch?: (params: T) => void
  /** 防抖延迟（毫秒），0 表示不防抖 */
  debounce?: number
  /** 是否深度监听 */
  deep?: boolean
}

/**
 * 简单的防抖函数
 */
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }) as T
}

/**
 * 搜索表单管理组合式函数
 */
export function useSearch<T extends Record<string, unknown>>(options: UseSearchOptions<T>) {
  const { defaultValues, onSearch, debounce: debounceDelay = 300, deep = true } = options

  // 搜索参数
  const params = ref<T>({ ...defaultValues } as T) as Ref<T>

  // 搜索状态
  const isSearching = ref(false)

  // 重置搜索参数
  const reset = (): void => {
    params.value = { ...defaultValues } as T
    onSearch?.(params.value)
  }

  // 执行搜索
  const search = (): void => {
    isSearching.value = true
    onSearch?.(params.value)
    isSearching.value = false
  }

  // 防抖搜索
  const debouncedSearch = debounceDelay > 0 ? debounce(search, debounceDelay) : search

  // 设置单个参数
  const setParam = <K extends keyof T>(key: K, value: T[K]): void => {
    params.value[key] = value
  }

  // 设置多个参数
  const setParams = (newParams: Partial<T>): void => {
    Object.assign(params.value, newParams)
  }

  // 清空参数（设为 undefined）
  const clearParams = (...keys: (keyof T)[]): void => {
    keys.forEach(key => {
      params.value[key] = undefined as T[keyof T]
    })
  }

  // 自动响应参数变化
  if (debounceDelay > 0) {
    watch(
      params,
      () => {
        debouncedSearch()
      },
      { deep }
    )
  }

  return {
    // 状态
    params,
    isSearching,

    // 方法
    reset,
    search,
    debouncedSearch,
    setParam,
    setParams,
    clearParams
  }
}

/**
 * 创建搜索字段配置
 */
export function createSearchFields<T extends Record<string, unknown>>(
  fields: Array<{
    prop: keyof T
    label: string
    type?: 'input' | 'select' | 'date' | 'number'
    placeholder?: string
    options?: Array<{ label: string; value: string | number | boolean }>
  }>
) {
  return fields
}
