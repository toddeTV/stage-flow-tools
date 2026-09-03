import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { throwApiError } from './api-errors'
import { verifyAdminWebSocket } from './auth'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifyAdminWebSocket', () => {
  it('accepts an admin token from the WebSocket upgrade cookie', async () => {
    vi.stubGlobal('throwApiError', throwApiError)
    vi.stubGlobal('useRuntimeConfig', () => ({
      adminToken: 'results-admin-token',
      jwtSecret: 'unused-for-static-token',
    }))

    await expect(verifyAdminWebSocket(new Request('http://localhost/_ws', {
      headers: { cookie: 'other=value; admin_token=results-admin-token' },
    }))).resolves.toEqual({
      authMethod: 'static-token',
      isAdmin: true,
      username: 'admin-token',
    })
  })

  it('rejects unauthenticated WebSocket upgrade requests', async () => {
    vi.stubGlobal('throwApiError', throwApiError)
    vi.stubGlobal('useRuntimeConfig', () => ({
      adminToken: 'results-admin-token',
      jwtSecret: 'unused-for-static-token',
    }))

    await expect(verifyAdminWebSocket(new Request('http://localhost/_ws'))).rejects.toThrowError(
      expect.objectContaining({ data: { code: 'auth.token_required' } }),
    )
  })
})
