import { onScopeDispose, ref } from 'vue'

export function useLatestRequest() {
  let generation = 0
  let current: AbortController | undefined
  const loading = ref(false)
  function begin() {
    current?.abort(); current = new AbortController()
    const token = ++generation; loading.value = true
    return {signal:current.signal, current:() => token === generation, end:() => { if (token === generation) loading.value = false }}
  }
  function invalidate() { generation++; current?.abort(); loading.value = false }
  onScopeDispose(invalidate)
  return {loading, begin, invalidate}
}
