import { onBeforeUnmount } from 'vue'
import { session } from '../../core/session'

export function useAdminScope() {
  let disposed = false
  const requests = new Set<AbortController>()
  onBeforeUnmount(() => { disposed = true; requests.forEach(request => request.abort()); requests.clear() })
  return () => {
    const revision = session.revision
    const jwt = session.jwt
    const request = new AbortController()
    requests.add(request)
    return { signal: request.signal, valid: () => !disposed && !request.signal.aborted && session.revision === revision && session.jwt === jwt, release: () => requests.delete(request) }
  }
}
