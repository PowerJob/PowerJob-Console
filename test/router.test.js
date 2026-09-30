import { beforeEach, describe, expect, it } from 'vitest'
import router from '../src/router.js'

beforeEach(async () => {
  localStorage.clear()
  await router.push('/loginHomepage')
})

describe('Session navigation', () => {
  it.each(['/oms/job', '/oms/workflowEditor?workflowId=9007199254740993', '/admin/app', '/admin/personal'])('returns an unauthenticated bookmark %s to sign-in', async path => {
    await router.push(path)
    expect(router.currentRoute.value.path).toBe('/loginHomepage')
  })
  it('preserves authenticated deep links and large identifiers', async () => {
    localStorage.setItem('PowerJwt', 'synthetic-session')
    await router.push('/oms/workflowEditor?workflowId=9007199254740993')
    expect(router.currentRoute.value.path).toBe('/oms/workflowEditor')
    expect(router.currentRoute.value.query.workflowId).toBe('9007199254740993')
  })
  it('keeps provider callbacks accessible and recovers unknown bookmarks', async () => {
    await router.push('/loginHomepage?jwt=synthetic-callback&a=a%2Bb%26c')
    expect(router.currentRoute.value.query.a).toBe('a+b&c')
    await router.push('/nonexistent-bookmark')
    expect(router.currentRoute.value.path).toBe('/loginHomepage')
  })
})
