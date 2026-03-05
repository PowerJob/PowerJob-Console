import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

interface UseFormDialogOptions<T extends object> {
  /** 默认表单值工厂函数 */
  defaultForm: () => T
  /** 保存方法 */
  saveFn: (data: T) => Promise<void>
  /** 保存成功回调 */
  onSuccess?: () => void
  /** 保存失败回调 */
  onError?: (error: Error) => void
}

export function useFormDialog<T extends object>(options: UseFormDialogOptions<T>) {
  const { defaultForm, saveFn, onSuccess, onError } = options

  // 状态
  const visible = ref(false)
  const loading = ref(false)
  const formData = ref<T>(defaultForm()) as Ref<T>
  const formRef = ref<any>(null)

  // 计算属性
  const isEdit: ComputedRef<boolean> = computed(() => {
    const data = formData.value as Record<string, unknown>
    return !!(data.id)
  })
  const title: ComputedRef<string> = computed(() =>
    isEdit.value ? '编辑' : '新建'
  )

  // 打开新建弹窗
  const openCreate = (): void => {
    formData.value = defaultForm()
    visible.value = true
  }

  // 打开编辑弹窗
  const openUpdate = (record: T): void => {
    formData.value = { ...record } as T
    visible.value = true
  }

  // 关闭弹窗
  const close = (): void => {
    visible.value = false
    loading.value = false
    // 重置表单
    setTimeout(() => {
      formData.value = defaultForm()
    }, 100)
  }

  // 保存
  const save = async (): Promise<boolean> => {
    // 表单验证
    if (formRef.value) {
      try {
        await formRef.value.validate()
      } catch {
        return false
      }
    }

    loading.value = true
    try {
      await saveFn(formData.value)
      close()
      onSuccess?.()
      return true
    } catch (error) {
      onError?.(error as Error)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    visible,
    loading,
    formData,
    formRef,
    // 计算属性
    isEdit,
    title,
    // 方法
    openCreate,
    openUpdate,
    close,
    save,
  }
}
