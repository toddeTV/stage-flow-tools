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
import { EmptyRequestSchema } from '../shared/utils/validation'
import {
  defineApiHandler,
  readValidatedRequestBody,
  throwApiError,
} from '../server/utils/api-errors'
import { verifyAdmin } from '../server/utils/auth'
import {
  createQuestion,
  getNextPublishableQuestion,
  getQuestions,
  getResultsForQuestion,
  publishQuestion,
} from '../server/utils/storage'
import { requestRoute } from './helpers/h3'
import { createIntegrationDatabase } from './helpers/local-sqlite'
import { serializePublicQuestion } from '../server/utils/public-question'

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
  vi.stubGlobal('EmptyRequestSchema', EmptyRequestSchema)
  vi.stubGlobal('getNextPublishableQuestion', getNextPublishableQuestion)
  vi.stubGlobal('getRequestURL', getRequestURL)
  vi.stubGlobal('getResultsForQuestion', getResultsForQuestion)
  vi.stubGlobal('publishQuestion', publishQuestion)
  vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
  vi.stubGlobal('serializePublicQuestion', serializePublicQuestion)
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
  it('distinguishes queue IDs from matching custom keys in responses, storage and broadcasts', async () => {
    const active = await createQuestion(createInputQuestion('active'))
    const next = await createQuestion(createInputQuestion('next'))
    const matchingKey = await createQuestion(createInputQuestion(next.id))
    await publishQuestion(active.key, 'key')
    const { default: publishNext } = await import('../server/api/questions/publish-next.post')
    const { default: publishByKey } = await import('../server/api/questions/publish.post')
    const headers = {
      authorization: 'Bearer admin-token',
      'content-type': 'application/json',
    }

    const nextResponse = await requestRoute(publishNext, '/api/questions/publish-next', {
      body: '{}', headers, method: 'POST',
    })

    expect(nextResponse.status).toBe(200)
    await expect(nextResponse.json()).resolves.toMatchObject({ id: next.id, is_active: true })
    expect((await getQuestions()).filter(question => question.is_active).map(question => question.id)).toEqual([
      next.id,
    ])
    expect(broadcast).toHaveBeenNthCalledWith(1, 'new-question', serializePublicQuestion({ ...next, is_active: true }))
    expect(broadcast).toHaveBeenNthCalledWith(2, 'results-update',
      expect.objectContaining({ question: expect.objectContaining({ id: next.id }) }), WebSocketChannel.RESULTS)
    expect(broadcast).toHaveBeenCalledTimes(2)

    broadcast.mockClear()
    const keyResponse = await requestRoute(publishByKey, '/api/questions/publish', {
      body: JSON.stringify({ key: next.id }), headers, method: 'POST',
    })

    expect(keyResponse.status).toBe(200)
    await expect(keyResponse.json()).resolves.toMatchObject({ id: matchingKey.id, is_active: true })
    expect((await getQuestions()).filter(question => question.is_active).map(question => question.id)).toEqual([
      matchingKey.id,
    ])
    expect(broadcast).toHaveBeenNthCalledWith(
      1, 'new-question', serializePublicQuestion({ ...matchingKey, is_active: true }),
    )
    expect(broadcast).toHaveBeenNthCalledWith(2, 'results-update',
      expect.objectContaining({ question: expect.objectContaining({ id: matchingKey.id }) }), WebSocketChannel.RESULTS)
    expect(broadcast).toHaveBeenCalledTimes(2)
  })

  it('rejects an ID without a matching key without changing state or broadcasting', async () => {
    const active = await createQuestion(createInputQuestion('active'))
    const other = await createQuestion(createInputQuestion('other'))
    await publishQuestion(active.key, 'key')
    const beforeQuestions = await getQuestions()
    const { default: route } = await import('../server/api/questions/publish.post')

    const response = await requestRoute(route, '/api/questions/publish', {
      body: JSON.stringify({ key: other.id }),
      headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ data: { code: 'quiz.question_not_found' } })
    await expect(getQuestions()).resolves.toEqual(beforeQuestions)
    expect(broadcast).not.toHaveBeenCalled()
    expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
  })

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
