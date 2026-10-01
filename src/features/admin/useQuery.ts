import { onBeforeUnmount, ref, shallowRef } from 'vue'

/** The newest submitted query owns data, error and loading, including after abort. */
export function useQuery<T>(initial: T) {
  const data = shallowRef(initial)
  const loading = ref(false)
  const error = ref('')
  let sequence = 0
  let controller: AbortController | undefined
  async function run(request: (signal: AbortSignal) => Promise<T>) {
    const current = ++sequence
    controller?.abort()
    controller = new AbortController()
    loading.value = true
    error.value = ''
    try {
      const result = await request(controller.signal)
      if (sequence === current) data.value = result
      return sequence === current
    } catch (failure) {
      const value = failure as Error
      if (sequence === current && value.name !== 'AbortError') error.value = value.message
      return false
    } finally {
      if (sequence === current) loading.value = false
    }
  }
  onBeforeUnmount(() => { sequence++; controller?.abort() })
  return { data, loading, error, run }
}
