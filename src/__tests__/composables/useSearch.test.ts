import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSearch } from '@/composables/useSearch'

describe('useSearch', () => {
  const mockOnSearch = vi.fn()

  beforeEach(() => {
    mockOnSearch.mockClear()
  })

  it('should initialize with default values', () => {
    const { params, isSearching } = useSearch({
      defaultValues: { keyword: '', status: undefined },
      onSearch: mockOnSearch,
      debounce: 0 // 禁用防抖以便测试
    })

    expect(params.value).toEqual({ keyword: '', status: undefined })
    expect(isSearching.value).toBe(false)
  })

  it('should update params correctly', () => {
    const { params, setParam, setParams } = useSearch({
      defaultValues: { keyword: '', status: undefined } as {
        keyword: string
        status: number | undefined
      },
      onSearch: mockOnSearch,
      debounce: 0
    })

    setParam('keyword', 'test')
    expect(params.value.keyword).toBe('test')

    setParams({ status: 1, keyword: 'updated' })
    expect(params.value).toEqual({ keyword: 'updated', status: 1 })
  })

  it('should clear params correctly', () => {
    const { params, clearParams } = useSearch({
      defaultValues: { keyword: 'test', status: 1 } as {
        keyword: string
        status: number | undefined
      },
      onSearch: mockOnSearch,
      debounce: 0
    })

    clearParams('status')
    expect(params.value.status).toBeUndefined()
    expect(params.value.keyword).toBe('test')
  })

  it('should call onSearch when search is triggered', () => {
    const { search, params } = useSearch({
      defaultValues: { keyword: 'test' },
      onSearch: mockOnSearch,
      debounce: 0
    })

    search()

    expect(mockOnSearch).toHaveBeenCalledWith(params.value)
    expect(mockOnSearch).toHaveBeenCalledTimes(1)
  })

  it('should reset to default values', () => {
    const { params, reset, setParam } = useSearch({
      defaultValues: { keyword: '', status: undefined } as {
        keyword: string
        status: number | undefined
      },
      onSearch: mockOnSearch,
      debounce: 0
    })

    setParam('keyword', 'modified')
    setParam('status', 1)

    reset()

    expect(params.value).toEqual({ keyword: '', status: undefined })
    expect(mockOnSearch).toHaveBeenCalled()
  })
})
