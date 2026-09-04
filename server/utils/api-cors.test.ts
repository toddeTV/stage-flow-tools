import {
  createApp,
  eventHandler,
  toWebHandler,
} from 'h3'
import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

import {
  getApiCorsOptions,
  handleApiCors,
  validateApiCorsConfig,
} from './api-cors'

const enabledConfig = {
  apiCorsAllowedOrigins: 'http://localhost:3030,https://slides.example',
  apiCorsEnabled: true,
}

async function requestApi(
  config: typeof enabledConfig,
  path: string,
  init: RequestInit,
) {
  let routeCalled = false
  const app = createApp()

  app.use(eventHandler((event) => {
    if (handleApiCors(event, config)) {
      return
    }

    routeCalled = true

    return { success: true }
  }))

  const response = await toWebHandler(app)(new Request(`https://quiz.example${path}`, init))

  return {
    response,
    routeCalled,
  }
}

describe('API CORS configuration', () => {
  it('stays disabled by default', () => {
    expect(getApiCorsOptions({
      apiCorsAllowedOrigins: '',
      apiCorsEnabled: false,
    })).toBeUndefined()
  })

  it('uses each configured HTTP(S) origin once', () => {
    expect(getApiCorsOptions({
      apiCorsAllowedOrigins: 'http://localhost:3030, https://slides.example, http://localhost:3030',
      apiCorsEnabled: 'true',
    })).toEqual({
      allowHeaders: [
        'Authorization',
        'Content-Type',
      ],
      credentials: false,
      methods: [
        'GET',
        'POST',
        'OPTIONS',
      ],
      origin: [
        'http://localhost:3030',
        'https://slides.example',
      ],
    })
  })

  it.each([
    '',
    '*',
    'https://*.example',
    'https://slides.example/path',
    'https://slides.example?preview=true',
    'https://user:password@slides.example',
    'ftp://slides.example',
  ])('rejects unsafe allowed origin %s', (apiCorsAllowedOrigins) => {
    expect(() => validateApiCorsConfig({
      apiCorsAllowedOrigins,
      apiCorsEnabled: true,
    })).toThrowError(/Invalid runtime config apiCorsAllowedOrigins/)
  })

  it.each([
    'enabled',
    1,
    null,
  ])('rejects invalid enabled value %s', (apiCorsEnabled) => {
    expect(() => validateApiCorsConfig({
      apiCorsAllowedOrigins: 'http://localhost:3030',
      apiCorsEnabled,
    })).toThrowError('Invalid runtime config apiCorsEnabled: expected true or false.')
  })
})

describe('API CORS middleware', () => {
  it('allows an exact configured origin on API responses without cookie credentials', async () => {
    const { response, routeCalled } = await requestApi(enabledConfig, '/api/questions/active', {
      headers: { origin: 'http://localhost:3030' },
    })

    expect(routeCalled).toBe(true)
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3030')
    expect(response.headers.get('access-control-allow-credentials')).toBeNull()
    expect(response.headers.get('vary')).toContain('origin')
  })

  it('ends allowed API preflights before their route handler', async () => {
    const { response, routeCalled } = await requestApi(enabledConfig, '/api/admin/presenter/current-state', {
      headers: {
        'access-control-request-headers': 'authorization,content-type',
        'access-control-request-method': 'GET',
        origin: 'http://localhost:3030',
      },
      method: 'OPTIONS',
    })

    expect(routeCalled).toBe(false)
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3030')
    expect(response.headers.get('access-control-allow-methods')).toBe('GET,POST,OPTIONS')
    expect(response.headers.get('access-control-allow-headers')).toBe('Authorization,Content-Type')
    expect(response.headers.get('access-control-allow-credentials')).toBeNull()
  })

  it('does not grant CORS to unconfigured origins', async () => {
    const { response, routeCalled } = await requestApi(enabledConfig, '/api/questions/active', {
      headers: { origin: 'https://untrusted.example' },
    })

    expect(routeCalled).toBe(true)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('leaves API requests unchanged when CORS is disabled', async () => {
    const { response, routeCalled } = await requestApi({
      apiCorsAllowedOrigins: 'http://localhost:3030',
      apiCorsEnabled: false,
    }, '/api/questions/active', {
      headers: { origin: 'http://localhost:3030' },
    })

    expect(routeCalled).toBe(true)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('does not apply CORS outside API routes', async () => {
    const { response, routeCalled } = await requestApi(enabledConfig, '/_ws/default', {
      headers: { origin: 'http://localhost:3030' },
    })

    expect(routeCalled).toBe(true)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})
