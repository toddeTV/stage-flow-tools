import { getRequestURL } from 'h3'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import {
  defineApiHandler,
  readValidatedRequestBody,
  throwApiError,
} from '../server/utils/api-errors'
import { verifyAdmin } from '../server/utils/auth'
import { requestRoute } from './helpers/h3'

const broadcast = vi.fn()
const cancelPendingResultsUpdate = vi.fn()
const deleteAllQuestions = vi.fn()
const getCurrentResults = vi.fn()

function configureRouteRuntime() {
  vi.stubGlobal('broadcast', broadcast)
  vi.stubGlobal('cancelPendingResultsUpdate', cancelPendingResultsUpdate)
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('deleteAllQuestions', deleteAllQuestions)
  vi.stubGlobal('getCurrentResults', getCurrentResults)
  vi.stubGlobal('getRequestURL', getRequestURL)
  vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
  vi.stubGlobal('throwApiError', throwApiError)
  vi.stubGlobal('useRuntimeConfig', () => ({
    adminToken: 'admin-token',
    jwtSecret: 'unused-for-static-token',
  }))
  vi.stubGlobal('verifyAdmin', verifyAdmin)
}

async function expectErrorCode(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  await expect(response.json()).resolves.toMatchObject({ data: { code } })
}

beforeEach(() => {
  configureRouteRuntime()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('admin route authorization', () => {
  it('rejects unauthenticated result requests and permits static bearer automation', async () => {
    getCurrentResults.mockResolvedValue({ totalConnections: 0, totalVotes: 0 })
    const { default: route } = await import('../server/api/results/current.get')

    await expectErrorCode(
      await requestRoute(route, '/api/results/current'),
      401,
      'auth.token_required',
    )
    expect(getCurrentResults).not.toHaveBeenCalled()

    const response = await requestRoute(route, '/api/results/current', {
      headers: { authorization: 'Bearer admin-token' },
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ totalConnections: 0, totalVotes: 0 })
  })

  it('rejects cross-origin cookie mutations before the database operation', async () => {
    const { default: route } = await import('../server/api/questions/delete-all.post')

    await expectErrorCode(
      await requestRoute(route, '/api/questions/delete-all', {
        body: '{}',
        headers: {
          'content-type': 'application/json',
          cookie: 'admin_token=admin-token',
          origin: 'https://untrusted.example',
        },
        method: 'POST',
      }),
      403,
      'auth.origin_invalid',
    )
    expect(deleteAllQuestions).not.toHaveBeenCalled()
  })
})
