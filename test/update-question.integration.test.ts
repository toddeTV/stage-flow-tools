import { eq } from 'drizzle-orm'
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
import { questions } from '../server/database/schema'
import {
  createQuestion,
  getAnswersForQuestion,
  getResultsForQuestion,
  submitAnswer,
  updateQuestion,
} from '../server/utils/storage'
import { requestRoute } from './helpers/h3'
import { createIntegrationDatabase } from './helpers/local-sqlite'

const broadcast = vi.fn()
const cancelPendingResultsUpdate = vi.fn()
let database: ReturnType<typeof createIntegrationDatabase>

function createInputQuestion(key: string) {
  return {
    answer_options: [
      { text: { en: 'One' } },
      { text: { en: 'Two' } },
    ],
    key,
    question_text: { en: key },
  }
}

function updatePayload(questionId: string, resetAnswers: boolean) {
  return {
    answer_options: [
      { text: { en: 'Updated one' } },
      { text: { en: 'Updated two' } },
    ],
    key: 'active-question',
    questionId,
    question_text: { en: 'Updated question' },
    resetAnswers,
  }
}

async function expectErrorCode(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  await expect(response.json()).resolves.toMatchObject({ data: { code } })
}

beforeEach(() => {
  database = createIntegrationDatabase()
  vi.stubGlobal('broadcast', broadcast)
  vi.stubGlobal('cancelPendingResultsUpdate', cancelPendingResultsUpdate)
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('getRequestURL', getRequestURL)
  vi.stubGlobal('getResultsForQuestion', getResultsForQuestion)
  vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
  vi.stubGlobal('throwApiError', throwApiError)
  vi.stubGlobal('updateQuestion', updateQuestion)
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

describe('POST /api/questions/update', () => {
  it('requires an explicit answer reset before changing active answered options', async () => {
    const question = await createQuestion(createInputQuestion('active-question'))
    database.client.db.update(questions).set({ isActive: true }).where(eq(questions.id, question.id)).run()
    await submitAnswer({
      question_id: question.id,
      selected_answer: { en: 'One' },
      user_id: 'participant-id',
      user_nickname: 'Participant',
    })
    const { default: route } = await import('../server/api/questions/update.post')

    await expectErrorCode(
      await requestRoute(route, '/api/questions/update', {
        body: JSON.stringify(updatePayload(question.id, false)),
        headers: {
          authorization: 'Bearer admin-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
      409,
      'quiz.question_answers_reset_required',
    )
    await expect(getAnswersForQuestion(question.id)).resolves.toHaveLength(1)
    expect(broadcast).not.toHaveBeenCalled()

    const response = await requestRoute(route, '/api/questions/update', {
      body: JSON.stringify(updatePayload(question.id, true)),
      headers: {
        authorization: 'Bearer admin-token',
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      answer_options: updatePayload(question.id, true).answer_options,
      id: question.id,
      is_active: true,
    })
    await expect(getAnswersForQuestion(question.id)).resolves.toEqual([])
    expect(broadcast).toHaveBeenNthCalledWith(
      1,
      'answers-reset',
      { questionId: question.id },
      WebSocketChannel.DEFAULT,
    )
    expect(broadcast).toHaveBeenNthCalledWith(2, 'new-question', {
      answer_options: updatePayload(question.id, true).answer_options,
      createdAt: question.createdAt,
      id: question.id,
      is_active: true,
      is_locked: false,
      question_text: { en: 'Updated question' },
    })
    expect(broadcast).toHaveBeenNthCalledWith(
      3,
      'results-update',
      expect.objectContaining({ question: expect.objectContaining({ id: question.id }) }),
      WebSocketChannel.RESULTS,
    )
    expect(cancelPendingResultsUpdate).toHaveBeenCalledOnce()
  })
})
