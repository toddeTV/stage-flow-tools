import { getRequestURL } from 'h3'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { WebSocketChannel } from '~/types'
import {
  defineApiHandler,
  readValidatedRequestBody,
  throwApiError,
} from '../server/utils/api-errors'
import { verifyAdmin } from '../server/utils/auth'
import {
  createQuestion,
  getResultsForQuestion,
  publishQuestion,
} from '../server/utils/storage'
import { requestRoute } from './helpers/h3'
import { createIntegrationDatabase } from './helpers/local-sqlite'

const broadcast = vi.fn()
const cancelPendingResultsUpdate = vi.fn()
let database: ReturnType<typeof createIntegrationDatabase>

function createInputQuestion(key: string) {
  return {
    answer_options: [
      { emoji: '⭐', text: { en: 'One' } },
      { text: { en: 'Two' } },
    ],
    key,
    note: { en: 'Admin-only note' },
    question_text: { en: key },
  }
}

beforeEach(() => {
  database = createIntegrationDatabase()
  vi.stubGlobal('broadcast', broadcast)
  vi.stubGlobal('cancelPendingResultsUpdate', cancelPendingResultsUpdate)
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('getRequestURL', getRequestURL)
  vi.stubGlobal('getResultsForQuestion', getResultsForQuestion)
  vi.stubGlobal('publishQuestion', publishQuestion)
  vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
  vi.stubGlobal('throwApiError', throwApiError)
  vi.stubGlobal('useRuntimeConfig', () => ({
    adminToken: 'admin-token',
    jwtSecret: 'unused-for-static-token',
  }))
  vi.stubGlobal('verifyAdmin', verifyAdmin)
})

afterEach(() => {
  database.dispose()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('POST /api/questions/publish', () => {
  it('publishes the stored question and broadcasts only its public form', async () => {
    const question = await createQuestion(createInputQuestion('question-key'))
    const { default: route } = await import('../server/api/questions/publish.post')

    const response = await requestRoute(route, '/api/questions/publish', {
      body: JSON.stringify({ key: question.key }),
      headers: {
        authorization: 'Bearer admin-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      id: question.id,
      is_active: true,
      key: question.key,
    })
    expect(broadcast).toHaveBeenNthCalledWith(1, 'new-question', {
      answer_options: [
        { text: { en: 'One' } },
        { text: { en: 'Two' } },
      ],
      createdAt: question.createdAt,
      id: question.id,
      is_active: true,
      is_locked: false,
      question_text: question.question_text,
    })
    expect(broadcast).toHaveBeenNthCalledWith(
      2,
      'results-update',
      expect.objectContaining({ question: expect.objectContaining({ id: question.id }) }),
      WebSocketChannel.RESULTS,
    )
    expect(cancelPendingResultsUpdate).toHaveBeenCalledOnce()
  })
})
