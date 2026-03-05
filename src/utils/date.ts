/** 补零 */
function addZero(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** 时间戳转字符串 */
export function timestamp2Str(ts: number): string {
  if (ts < 10000) {
    return 'N/A'
  }
  try {
    const time = new Date(ts)
    const y = time.getFullYear()
    const M = time.getMonth() + 1
    const d = time.getDate()
    const h = time.getHours()
    const m = time.getMinutes()
    const s = time.getSeconds()
    return `${y}-${addZero(M)}-${addZero(d)} ${addZero(h)}:${addZero(m)}:${addZero(s)}`
  } catch {
    return 'N/A'
  }
}

/** 格式化持续时间（毫秒） */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
