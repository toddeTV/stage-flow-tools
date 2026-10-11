import { getRequestURL } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { WebSocketChannel } from '~/types'
import { defineApiHandler, readValidatedRequestBody, throwApiError } from '../server/utils/api-errors'
import { verifyAdmin } from '../server/utils/auth'
import { requestRoute } from './helpers/h3'

const broadcast = vi.fn()
const cancelPendingResultsUpdate = vi.fn()
const resetQuiz = vi.fn()

beforeEach(() => {
  vi.stubGlobal('broadcast', broadcast)
  vi.stubGlobal('cancelPendingResultsUpdate', cancelPendingResultsUpdate)
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('getRequestURL', getRequestURL)
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
  vi.stubGlobal('resetQuiz', resetQuiz)
  vi.stubGlobal('throwApiError', throwApiError)
  vi.stubGlobal('useRuntimeConfig', () => ({ adminToken: 'test-admin-token', jwtSecret: 'test-secret' }))
  vi.stubGlobal('verifyAdmin', verifyAdmin)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

async function requestReset(
  body?: string,
  headers: Record<string, string> = { authorization: 'Bearer test-admin-token' },
) {
  const { default: route } = await import('../server/api/questions/reset.post')
  return requestRoute(route, '/api/questions/reset', {
    body,
    headers: { 'content-type': 'application/json', ...headers },
    method: 'POST',
  })
}

describe('POST /api/questions/reset', () => {
  it.each([
    [
      {},
      401,
      'auth.token_required',
    ],
    [
      { authorization: 'Bearer wrong-token' },
      401,
      'auth.token_invalid',
    ],
    [
      { cookie: 'admin_token=test-admin-token', origin: 'https://untrusted.example' },
      403,
      'auth.origin_invalid',
    ],
  ] as const)('rejects unauthorized requests before resetting: %j', async (headers, status, code) => {
    const response = await requestReset('{}', headers)

    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toMatchObject({ data: { code } })
    expect(resetQuiz).not.toHaveBeenCalled()
    expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
    expect(broadcast).not.toHaveBeenCalled()
  })

  it.each([
    '{"unexpected":true}',
    'null',
    '[1]',
    'invalid-json',
  ])('rejects an invalid request body: %s', async (body) => {
    const response = await requestReset(body)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ data: { code: 'validation.invalid_request' } })
    expect(resetQuiz).not.toHaveBeenCalled()
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('clears connected answer caches and live state only after storage completes', async () => {
    let completeReset!: (ids: string[]) => void
    resetQuiz.mockReturnValue(new Promise<string[]>((resolve) => { completeReset = resolve }))
    const pendingResponse = requestReset('{}')
    await vi.waitFor(() => expect(resetQuiz).toHaveBeenCalledOnce())
    expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
    expect(broadcast).not.toHaveBeenCalled()

    completeReset([
      'first-question',
      'second-question',
    ])
    const response = await pendingResponse

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ resetQuestionCount: 2, success: true })
    expect(cancelPendingResultsUpdate).toHaveBeenCalledOnce()
    expect(broadcast.mock.calls).toEqual([
      [
        'answers-reset',
        { questionId: 'first-question' },
        WebSocketChannel.DEFAULT,
      ],
      [
        'answers-reset',
        { questionId: 'second-question' },
        WebSocketChannel.DEFAULT,
      ],
      [
        'new-question',
        null,
      ],
      [
        'results-update',
        null,
        WebSocketChannel.RESULTS,
      ],
    ])
    expect(cancelPendingResultsUpdate.mock.invocationCallOrder[0]).toBeLessThan(broadcast.mock.invocationCallOrder[0]!)
  })

  it('accepts no body and an empty quiz', async () => {
    resetQuiz.mockResolvedValue([])
    const response = await requestReset()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ resetQuestionCount: 0, success: true })
    expect(broadcast.mock.calls).toEqual([
      [
        'new-question',
        null,
      ],
      [
        'results-update',
        null,
        WebSocketChannel.RESULTS,
      ],
    ])
  })

  it('reports storage failure without broadcasting a reset', async () => {
    resetQuiz.mockRejectedValue(new Error('test storage failure'))
    const response = await requestReset('{}')

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ data: { code: 'server.internal_error' } })
    expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
    expect(broadcast).not.toHaveBeenCalled()
  })
})
