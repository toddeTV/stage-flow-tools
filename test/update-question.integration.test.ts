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
  getQuestions,
  getResultsForQuestion,
  publishQuestion,
  submitAnswer,
  updateQuestion,
} from '../server/utils/storage'
import { requestRoute } from './helpers/h3'
import { createIntegrationDatabase } from './helpers/local-sqlite'

const broadcast = vi.fn()
const cancelPendingResultsUpdate = vi.fn()
const calculateResults = vi.fn(getResultsForQuestion)
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
  vi.stubGlobal('getResultsForQuestion', calculateResults)
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('publishQuestion', publishQuestion)
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
  it.each([
    undefined,
    '',
    ' \t ',
  ])('preserves an omitted or blank key and permits manual publication: %j', async (key) => {
    const question = await createQuestion(createInputQuestion('stable-key'))
    const { default: update } = await import('../server/api/questions/update.post')
    const { default: publish } = await import('../server/api/questions/publish.post')
    const headers = { authorization: 'Bearer admin-token', 'content-type': 'application/json' }

    const response = await requestRoute(update, '/api/questions/update', {
      body: JSON.stringify({
        ...createInputQuestion('stable-key'), key, questionId: question.id,
        question_text: { en: 'Updated question' },
      }),
      headers, method: 'POST',
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ id: question.id, key: question.key })
    await expect(getQuestions()).resolves.toMatchObject([
      { id: question.id, key: question.key },
    ])

    const published = await requestRoute(publish, '/api/questions/publish', {
      body: JSON.stringify({ key: question.key }), headers, method: 'POST',
    })
    expect(published.status).toBe(200)
    await expect(published.json()).resolves.toMatchObject({ id: question.id, key: question.key, is_active: true })
  })

  it.each([
    { name: 'explicit trimmed replacement', storedKey: 'stable-key', key: ' new-key ', expectedKey: 'new-key' },
    { name: 'legacy empty key', storedKey: '', key: '', expectedKey: undefined },
    { name: 'legacy whitespace key', storedKey: ' \t ', key: '', expectedKey: undefined },
  ])('stores a publishable key for $name', async ({ storedKey, key, expectedKey }) => {
    const question = await createQuestion(createInputQuestion('stable-key'))
    database.client.db.update(questions).set({ key: storedKey }).where(eq(questions.id, question.id)).run()
    const { default: update } = await import('../server/api/questions/update.post')
    const { default: publish } = await import('../server/api/questions/publish.post')
    const headers = { authorization: 'Bearer admin-token', 'content-type': 'application/json' }
    const normalizedKey = expectedKey ?? question.id

    const response = await requestRoute(update, '/api/questions/update', {
      body: JSON.stringify({ ...createInputQuestion('stable-key'), key, questionId: question.id }),
      headers, method: 'POST',
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ id: question.id, key: normalizedKey })
    await expect(getQuestions()).resolves.toMatchObject([
      { id: question.id, key: normalizedKey },
    ])

    const published = await requestRoute(publish, '/api/questions/publish', {
      body: JSON.stringify({ key: normalizedKey }), headers, method: 'POST',
    })
    expect(published.status).toBe(200)
    await expect(published.json()).resolves.toMatchObject({ id: question.id, key: normalizedKey, is_active: true })
  })

  it.each([
    { name: 'explicit key', useIdFallback: false },
    { name: 'legacy ID fallback', useIdFallback: true },
  ])('rejects a conflicting $name before a confirmed answer reset', async ({ useIdFallback }) => {
    const question = await createQuestion(createInputQuestion('active-question'))
    await createQuestion(createInputQuestion(useIdFallback ? question.id : 'occupied'))
    database.client.db.update(questions).set({
      isActive: true, key: useIdFallback ? '' : question.key,
    }).where(eq(questions.id, question.id)).run()
    await submitAnswer({
      question_id: question.id, selected_answer: { en: 'One' },
      user_id: 'participant-id', user_nickname: 'Participant',
    })
    const beforeQuestions = await getQuestions()
    const beforeAnswers = await getAnswersForQuestion(question.id)
    const { default: route } = await import('../server/api/questions/update.post')

    const response = await requestRoute(route, '/api/questions/update', {
      body: JSON.stringify({ ...updatePayload(question.id, true), key: useIdFallback ? '' : ' occupied ' }),
      headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
      method: 'POST',
    })

    await expectErrorCode(response, 409, 'quiz.question_key_conflict')
    await expect(getQuestions()).resolves.toEqual(beforeQuestions)
    await expect(getAnswersForQuestion(question.id)).resolves.toEqual(beforeAnswers)
    expect(broadcast).not.toHaveBeenCalled()
    expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
    expect(calculateResults).not.toHaveBeenCalled()
  })

  describe.each([
    false,
    true,
  ])('invalid options with resetAnswers=%s', (resetAnswers) => {
    it.each([
      { labels: [], code: 'validation.minimum_answer_options' },
      { labels: [
        'One',
      ], code: 'validation.minimum_answer_options' },
      { labels: [
        'One',
        'One',
      ], code: 'validation.duplicate_answer_option' },
      { labels: [
        'One',
        'oNe',
      ], code: 'validation.duplicate_answer_option' },
      { labels: [
        ' One ',
        'one ',
      ], code: 'validation.duplicate_answer_option' },
    ])('rejects $labels without persistence or broadcasts', async ({ labels, code }) => {
      const question = await createQuestion(createInputQuestion('active-question'))
      database.client.db.update(questions).set({ isActive: true }).where(eq(questions.id, question.id)).run()
      await submitAnswer({
        question_id: question.id, selected_answer: { en: 'One' },
        user_id: 'participant-id', user_nickname: 'Participant',
      })
      const beforeQuestions = await getQuestions()
      const beforeAnswers = await getAnswersForQuestion(question.id)
      const { default: route } = await import('../server/api/questions/update.post')

      const response = await requestRoute(route, '/api/questions/update', {
        body: JSON.stringify({
          ...updatePayload(question.id, resetAnswers),
          answer_options: labels.map(en => ({ text: { en } })),
        }),
        headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
        method: 'POST',
      })

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        statusMessage: 'validation.invalid_request',
        data: { code: 'validation.invalid_request', issues: [
          { code, path: [
            'answer_options',
          ] },
        ] },
      })
      await expect(getQuestions()).resolves.toEqual(beforeQuestions)
      await expect(getAnswersForQuestion(question.id)).resolves.toEqual(beforeAnswers)
      expect(broadcast).not.toHaveBeenCalled()
      expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
      expect(calculateResults).not.toHaveBeenCalled()
    })
  })

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
