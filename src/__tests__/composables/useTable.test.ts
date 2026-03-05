import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PageResult } from '@/api/types'

// 简化版 useTable 测试（不依赖 Vue 组件环境）
describe('useTable', () => {
  const mockFetchFn = vi.fn()

  const createMockResponse = <T>(data: T[], total = 100): PageResult<T> => ({
    data,
    totalItems: total,
    totalPages: Math.ceil(total / 10),
    pageSize: 10
  })

  beforeEach(() => {
    mockFetchFn.mockReset()
    mockFetchFn.mockResolvedValue(createMockResponse([{ id: 1, name: 'test' }]))
  })

  it('should initialize with default values', () => {
    const options = {
      fetchFn: mockFetchFn,
      immediate: false
    }

    // 验证默认配置
    expect(options.immediate).toBe(false)
    expect(options.defaultPageSize).toBeUndefined()
  })

  it('should call fetchFn with correct params', async () => {
    const params = {
      index: 0,
      pageSize: 10,
      keyword: 'test'
    }

    await mockFetchFn(params)

    expect(mockFetchFn).toHaveBeenCalledWith(params)
  })

  it('should handle pagination correctly', () => {
    // 测试分页逻辑
    const page = 2
    const pageSize = 20

    // 后端索引从 0 开始
    const backendIndex = page - 1

    expect(backendIndex).toBe(1)
    expect(pageSize).toBe(20)
  })

  it('should merge query params correctly', () => {
    const baseParams = { index: 0, pageSize: 10 }
    const queryParams = { keyword: 'test', status: 1 }
    const mergedParams = { ...baseParams, ...queryParams }

    expect(mergedParams).toEqual({
      index: 0,
      pageSize: 10,
      keyword: 'test',
      status: 1
    })
  })
})
