import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { throwApiError } from './api-errors'
import {
  isSameOriginHttpRequest,
  isSameOriginWebSocketRequest,
  verifyAdmin,
  verifyAdminWebSocket,
} from './auth'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isSameOriginWebSocketRequest', () => {
  it('accepts matching request and browser origins', () => {
    expect(isSameOriginWebSocketRequest(new Request('https://quiz.example/_ws', {
      headers: { origin: 'https://quiz.example' },
    }))).toBe(true)
  })

  it('rejects missing and cross-site browser origins', () => {
    expect(isSameOriginWebSocketRequest(new Request('https://quiz.example/_ws'))).toBe(false)
    expect(isSameOriginWebSocketRequest(new Request('https://quiz.example/_ws', {
      headers: { origin: 'https://untrusted.example' },
    }))).toBe(false)
  })
})

describe('isSameOriginHttpRequest', () => {
  it('accepts matching request and browser origins', () => {
    vi.stubGlobal('getRequestURL', () => new URL('https://quiz.example/api/questions/delete-all'))

    expect(isSameOriginHttpRequest({
      headers: new Headers({ origin: 'https://quiz.example' }),
    } as never)).toBe(true)
  })

  it('rejects missing and cross-site browser origins', () => {
    vi.stubGlobal('getRequestURL', () => new URL('https://quiz.example/api/questions/delete-all'))

    expect(isSameOriginHttpRequest({ headers: new Headers() } as never)).toBe(false)
    expect(isSameOriginHttpRequest({
      headers: new Headers({ origin: 'https://untrusted.example' }),
    } as never)).toBe(false)
  })
})

describe('verifyAdmin', () => {
  function configureAdminRequestAuth() {
    vi.stubGlobal('getRequestURL', () => new URL('https://quiz.example/api/questions/delete-all'))
    vi.stubGlobal('throwApiError', throwApiError)
    vi.stubGlobal('useRuntimeConfig', () => ({
      adminToken: 'admin-token',
      jwtSecret: 'unused-for-static-token',
    }))
  }

  it('rejects a cross-site unsafe request authenticated by cookie', async () => {
    configureAdminRequestAuth()

    await expect(verifyAdmin({
      headers: new Headers({
        cookie: 'admin_token=admin-token',
        origin: 'https://untrusted.example',
      }),
      method: 'POST',
    } as never)).rejects.toThrowError(expect.objectContaining({
      data: { code: 'auth.origin_invalid' },
      statusCode: 403,
    }))
  })

  it('accepts a same-origin unsafe request authenticated by cookie', async () => {
    configureAdminRequestAuth()

    await expect(verifyAdmin({
      headers: new Headers({
        cookie: 'admin_token=admin-token',
        origin: 'https://quiz.example',
      }),
      method: 'POST',
    } as never)).resolves.toEqual({
      authMethod: 'static-token',
      isAdmin: true,
      username: 'admin-token',
    })
  })

  it('allows bearer-token automation without a browser origin', async () => {
    configureAdminRequestAuth()

    await expect(verifyAdmin({
      headers: new Headers({ authorization: 'Bearer admin-token' }),
      method: 'POST',
    } as never)).resolves.toEqual({
      authMethod: 'static-token',
      isAdmin: true,
      username: 'admin-token',
    })
  })

  it('does not require a browser origin for safe cookie-authenticated requests', async () => {
    configureAdminRequestAuth()

    await expect(verifyAdmin({
      headers: new Headers({ cookie: 'admin_token=admin-token' }),
      method: 'GET',
    } as never)).resolves.toEqual({
      authMethod: 'static-token',
      isAdmin: true,
      username: 'admin-token',
    })
  })
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
