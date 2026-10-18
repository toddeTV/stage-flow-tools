import { eq } from 'drizzle-orm'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import {
  createQuestion,
  getActiveQuestion,
  getAnswersForQuestion,
  publishQuestion,
  submitAnswer,
} from '../server/utils/storage'
import {
  defineApiHandler,
  readValidatedRequestBody,
  throwApiError,
} from '../server/utils/api-errors'
import { questions } from '../server/database/schema'
import { requestRoute } from './helpers/h3'
import { createIntegrationDatabase } from './helpers/local-sqlite'

const requestResultsUpdate = vi.fn()
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

async function expectErrorCode(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  await expect(response.json()).resolves.toMatchObject({ data: { code } })
}

beforeEach(() => {
  database = createIntegrationDatabase()
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('getActiveQuestion', getActiveQuestion)
  vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
  vi.stubGlobal('requestResultsUpdate', requestResultsUpdate)
  vi.stubGlobal('submitAnswer', submitAnswer)
  vi.stubGlobal('throwApiError', throwApiError)
})

afterEach(() => {
  database.dispose()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('POST /api/answers/submit', () => {
  it('rejects a delayed answer for A after B with identical options is published', async () => {
    const first = await createQuestion(createInputQuestion('first'))
    const second = await createQuestion(createInputQuestion('second'))
    await publishQuestion(first.id, 'id')
    const body = {
      question_id: first.id,
      selected_answer: { en: 'One' },
      user_id: 'participant-id',
      user_nickname: 'Participant',
    }
    await publishQuestion(second.id, 'id')
    const { default: route } = await import('../server/api/answers/submit.post')

    await expectErrorCode(await requestRoute(route, '/api/answers/submit', {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }), 409, 'quiz.question_changed')

    await expect(getAnswersForQuestion(first.id)).resolves.toEqual([])
    await expect(getAnswersForQuestion(second.id)).resolves.toEqual([])
    expect(requestResultsUpdate).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    '',
    '   ',
  ])('rejects a missing or empty question ID (%s)', async (questionId) => {
    const question = await createQuestion(createInputQuestion('active'))
    await publishQuestion(question.id, 'id')
    const { default: route } = await import('../server/api/answers/submit.post')

    await expectErrorCode(await requestRoute(route, '/api/answers/submit', {
      body: JSON.stringify({
        question_id: questionId,
        selected_answer: { en: 'One' },
        user_id: 'participant-id',
        user_nickname: 'Participant',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }), 400, 'validation.invalid_request')

    await expect(getAnswersForQuestion(question.id)).resolves.toEqual([])
    expect(requestResultsUpdate).not.toHaveBeenCalled()
  })

  it.each([
    [
      'changed',
      409,
      'quiz.question_changed',
    ],
    [
      'locked',
      403,
      'quiz.question_locked',
    ],
  ] as const)('rejects a question %s between the route check and storage write', async (change, status, code) => {
    const question = await createQuestion(createInputQuestion('active'))
    await publishQuestion(question.id, 'id')
    vi.stubGlobal('submitAnswer', async (answer: Parameters<typeof submitAnswer>[0]) => {
      database.client.db.update(questions).set(change === 'changed'
        ? { isActive: false }
        : { isLocked: true }).where(eq(questions.id, question.id)).run()
      await submitAnswer(answer)
    })
    const { default: route } = await import('../server/api/answers/submit.post')

    await expectErrorCode(await requestRoute(route, '/api/answers/submit', {
      body: JSON.stringify({
        question_id: question.id,
        selected_answer: { en: 'One' },
        user_id: 'participant-id',
        user_nickname: 'Participant',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    }), status, code)

    await expect(getAnswersForQuestion(question.id)).resolves.toEqual([])
    expect(requestResultsUpdate).not.toHaveBeenCalled()
  })

  it('persists the canonical answer for the active question and requests one results update', async () => {
    const question = await createQuestion(createInputQuestion('active-question'))
    database.client.db.update(questions).set({ isActive: true }).where(eq(questions.id, question.id)).run()
    const { default: route } = await import('../server/api/answers/submit.post')

    const response = await requestRoute(route, '/api/answers/submit', {
      body: JSON.stringify({
        question_id: question.id,
        selected_answer: { en: 'one' },
        user_id: 'participant-id',
        user_nickname: 'Participant',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    await expect(getAnswersForQuestion(question.id)).resolves.toEqual([
      expect.objectContaining({
        question_id: question.id,
        selected_answer: { en: 'One' },
        user_id: 'participant-id',
      }),
    ])
    expect(requestResultsUpdate).toHaveBeenCalledOnce()
  })

  it('rejects locked and invalid answers without persisting data', async () => {
    const question = await createQuestion(createInputQuestion('locked-question'))
    database.client.db.update(questions).set({
      isActive: true,
      isLocked: true,
    }).where(eq(questions.id, question.id)).run()
    const { default: route } = await import('../server/api/answers/submit.post')

    await expectErrorCode(
      await requestRoute(route, '/api/answers/submit', {
        body: JSON.stringify({
          question_id: question.id,
          selected_answer: { en: 'One' },
          user_id: 'participant-id',
          user_nickname: 'Participant',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
      403,
      'quiz.question_locked',
    )
    database.client.db.update(questions).set({ isLocked: false }).where(eq(questions.id, question.id)).run()

    await expectErrorCode(
      await requestRoute(route, '/api/answers/submit', {
        body: JSON.stringify({
          question_id: question.id,
          selected_answer: { en: 'Unknown' },
          user_id: 'participant-id',
          user_nickname: 'Participant',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
      400,
      'quiz.invalid_answer',
    )
    await expect(getAnswersForQuestion(question.id)).resolves.toEqual([])
    expect(requestResultsUpdate).not.toHaveBeenCalled()
  })
})
