import { describe, it, expect } from 'vitest'
import { timestamp2Str, formatDuration } from '@/utils/date'

describe('date utils', () => {
  describe('timestamp2Str', () => {
    it('should return N/A for small timestamps', () => {
      expect(timestamp2Str(0)).toBe('N/A')
      expect(timestamp2Str(1000)).toBe('N/A')
      expect(timestamp2Str(9999)).toBe('N/A')
    })

    it('should format valid timestamp correctly', () => {
      // 2024-01-15 10:30:45
      const ts = new Date('2024-01-15T10:30:45').getTime()
      expect(timestamp2Str(ts)).toBe('2024-01-15 10:30:45')
    })

    it('should pad single digits with zeros', () => {
      // 2024-02-01 05:03:02
      const ts = new Date('2024-02-01T05:03:02').getTime()
      expect(timestamp2Str(ts)).toBe('2024-02-01 05:03:02')
    })
  })

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(100)).toBe('100ms')
      expect(formatDuration(999)).toBe('999ms')
    })

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1s')
      expect(formatDuration(59000)).toBe('59s')
    })

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(90000)).toBe('1m 30s')
      expect(formatDuration(3540000)).toBe('59m 0s')
    })

    it('should format hours', () => {
      expect(formatDuration(3661000)).toBe('1h 1m')
      expect(formatDuration(7200000)).toBe('2h 0m')
      expect(formatDuration(7261000)).toBe('2h 1m')
    })
  })
})
