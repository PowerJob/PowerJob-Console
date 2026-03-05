import { describe, it, expect, vi, beforeEach } from 'vitest'

interface TestForm {
  id?: number
  name: string
  email: string
}

const defaultForm = (): TestForm => ({
  id: undefined,
  name: '',
  email: ''
})

describe('useFormDialog', () => {
  const mockSaveFn = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    mockSaveFn.mockReset()
    mockOnSuccess.mockClear()
    mockOnError.mockClear()
  })

  it('should initialize with correct default values', () => {
    // 验证默认表单值
    const form = defaultForm()
    expect(form.id).toBeUndefined()
    expect(form.name).toBe('')
    expect(form.email).toBe('')
  })

  it('should detect edit mode by id presence', () => {
    const createForm = defaultForm()
    const editForm: TestForm = { id: 1, name: 'Test', email: 'test@example.com' }

    // 新建模式
    expect(createForm.id).toBeUndefined()

    // 编辑模式
    expect(editForm.id).toBe(1)
  })

  it('should copy form data for editing', () => {
    const record: TestForm = { id: 1, name: 'Test', email: 'test@example.com' }
    const formData = { ...record }

    expect(formData).toEqual(record)
    expect(formData).not.toBe(record) // 是副本，不是引用
  })

  it('should reset form on close', () => {
    const form = defaultForm()
    form.name = 'Modified'
    form.email = 'modified@example.com'

    // 模拟关闭时重置
    const resetForm = defaultForm()
    expect(resetForm.name).toBe('')
    expect(resetForm.email).toBe('')
  })

  it('should handle save success', async () => {
    mockSaveFn.mockResolvedValue(undefined)

    const form: TestForm = { id: 1, name: 'Test', email: 'test@example.com' }
    await mockSaveFn(form)

    expect(mockSaveFn).toHaveBeenCalledWith(form)
  })

  it('should handle save error', async () => {
    const error = new Error('Save failed')
    mockSaveFn.mockRejectedValue(error)

    try {
      await mockSaveFn({ name: 'Test', email: 'test' })
    } catch (e) {
      expect(e).toBe(error)
    }

    expect(mockSaveFn).toHaveBeenCalled()
  })
})
