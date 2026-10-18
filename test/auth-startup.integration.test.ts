import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test'

let start: typeof import('../server/plugins/auth').default

beforeAll(async () => {
  vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
  start = (await import('../server/plugins/auth')).default
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('auth startup plugin', () => {
  it.each([
    'development',
    'production',
  ])('rejects invalid credentials in %s mode', (mode) => {
    vi.stubEnv('NODE_ENV', mode)
    for (const config of [
      { adminPassword: '', jwtSecret: 'test-only-jwt-secret' },
      { adminPassword: '123', jwtSecret: 'test-only-jwt-secret' },
      { adminPassword: 'test-only-password', jwtSecret: '' },
      {
        adminPassword: 'test-only-password',
        jwtSecret: 'tryUJ0zQbstPbTOrezme+Fv+KndzDNRx5lmSeelr2ial2/2yV8HqLeQ2felJafqf',
      },
    ]) {
      vi.stubGlobal('useRuntimeConfig', () => config)

      expect(() => start({} as never)).toThrowError('Invalid runtime config NUXT_')
    }
  })

  it('allows startup with explicit credentials and no static token', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      adminPassword: 'test-only-admin-password',
      adminToken: '',
      jwtSecret: 'test-only-jwt-secret',
    }))

    expect(() => start({} as never)).not.toThrow()
  })
})
