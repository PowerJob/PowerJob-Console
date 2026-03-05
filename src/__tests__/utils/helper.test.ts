import { describe, it, expect } from 'vitest'
import {
  buildQueryString,
  buildUrl,
  filterEmptyParams,
  getErrorMessage,
  ErrorCode
} from '@/api/helper'

describe('API Helper', () => {
  describe('filterEmptyParams', () => {
    it('should filter undefined and null values', () => {
      const params = {
        name: 'test',
        age: undefined,
        email: null,
        active: true
      }

      const result = filterEmptyParams(params)

      expect(result).toEqual({
        name: 'test',
        active: true
      })
    })

    it('should return empty object for empty input', () => {
      expect(filterEmptyParams({})).toEqual({})
      expect(filterEmptyParams({ a: undefined, b: null })).toEqual({})
    })
  })

  describe('buildQueryString', () => {
    it('should build query string correctly', () => {
      const params = {
        name: 'John Doe',
        age: 30,
        active: true
      }

      const result = buildQueryString(params)

      expect(result).toContain('name=John+Doe')
      expect(result).toContain('age=30')
      expect(result).toContain('active=true')
    })

    it('should return empty string for empty params', () => {
      expect(buildQueryString({})).toBe('')
      expect(buildQueryString({ a: undefined })).toBe('')
    })
  })

  describe('buildUrl', () => {
    it('should build URL with query string', () => {
      const result = buildUrl('/api/users', { page: 1, size: 10 })
      expect(result).toBe('/api/users?page=1&size=10')
    })

    it('should return path only for empty params', () => {
      expect(buildUrl('/api/users')).toBe('/api/users')
      expect(buildUrl('/api/users', {})).toBe('/api/users')
    })
  })

  describe('getErrorMessage', () => {
    it('should return mapped error message', () => {
      expect(getErrorMessage(ErrorCode.UNAUTHORIZED)).toBe('登录已过期，请重新登录')
      expect(getErrorMessage(ErrorCode.FORBIDDEN)).toBe('没有权限执行此操作')
    })

    it('should return default message for unknown error code', () => {
      expect(getErrorMessage('-999')).toBe('请求失败')
      expect(getErrorMessage('-999', 'Custom error')).toBe('Custom error')
    })
  })
})
