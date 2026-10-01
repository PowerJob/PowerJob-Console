import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  delete window.POWERJOB_CONFIG
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('deployment URL configuration contract', () => {
  it.each([
    { runtime: '/api', build: '/unused', page: 'http://console.example:8181/', base: '/api', expected: 'http://console.example:8181/api/job/run', ws: 'ws://console.example:8181/api/container/deploy/9223372036854775806' },
    { runtime: './backend', build: '/unused', page: 'http://console.example:8181/console/index.html', base: './backend', expected: 'http://console.example:8181/console/backend/job/run', ws: 'ws://console.example:8181/console/backend/container/deploy/9223372036854775806' },
    { runtime: 'https://server.example:8443/powerjob/', build: '/unused', page: 'https://console.example/console/', base: 'https://server.example:8443/powerjob', expected: 'https://server.example:8443/powerjob/job/run', ws: 'wss://server.example:8443/powerjob/container/deploy/9223372036854775806' },
    { runtime: 'http://server.example:7700/context/', build: '/unused', page: 'https://console.example/', base: 'http://server.example:7700/context', expected: 'http://server.example:7700/context/job/run', ws: 'ws://server.example:7700/context/container/deploy/9223372036854775806' },
    { runtime: '', build: '/built-api/', page: 'https://console.example/console/', base: '/built-api', expected: 'https://console.example/built-api/job/run', ws: 'wss://console.example/built-api/container/deploy/9223372036854775806' },
    { runtime: '', build: '', page: 'https://console.example/console/index.html#/oms/job', base: '/console', expected: 'https://console.example/console/job/run', ws: 'wss://console.example/console/container/deploy/9223372036854775806' },
    { runtime: '', build: '', page: 'http://console.example:8181/#/oms/job', base: '', expected: 'http://console.example:8181/job/run', ws: 'ws://console.example:8181/container/deploy/9223372036854775806' },
  ])('resolves $runtime at $page with the original port and context', async fixture => {
    vi.resetModules()
    window.POWERJOB_CONFIG = { apiBaseUrl: fixture.runtime }
    vi.stubEnv('VITE_API_BASE_URL', fixture.build)
    vi.stubEnv('DEV', false)
    vi.stubGlobal('location', new URL(fixture.page))
    const { apiBaseUrl, endpoint, websocketUrl } = await import('../../src/core/api')
    expect(apiBaseUrl).toBe(fixture.base)
    const url = new URL(endpoint('/job/run', { jobId: '9223372036854775806', instanceParams: '中文😀 &=+?#/%\n' }))
    expect(url.origin + url.pathname).toBe(fixture.expected)
    expect(url.searchParams.get('jobId')).toBe('9223372036854775806')
    expect(url.searchParams.get('instanceParams')).toBe('中文😀 &=+?#/%\n')
    expect(websocketUrl('/container/deploy/9223372036854775806')).toBe(fixture.ws)
  })
  it('uses the development proxy only when no deployment configuration is supplied', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('DEV', true)
    vi.stubGlobal('location', new URL('http://localhost:5173/'))
    const { apiBaseUrl, endpoint } = await import('../../src/core/api')
    expect(apiBaseUrl).toBe('/api')
    expect(endpoint('/auth/supportLoginTypes')).toBe('http://localhost:5173/api/auth/supportLoginTypes')
  })
})
