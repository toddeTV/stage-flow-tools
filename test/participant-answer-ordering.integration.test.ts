import { effectScope, onScopeDispose, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useQuizParticipant } from '../app/composables/useQuizParticipant'
import { EmojiSchema, getValidationIssues, NicknameSchema } from '../shared/utils/validation'
import {
  createQuestion,
  getAnswersForQuestion,
  publishQuestion,
  retractAnswer,
  submitAnswer,
} from '../server/utils/storage'
import { createIntegrationDatabase } from './helpers/local-sqlite'

const local = new Map<string, string>()
const session = new Map<string, string>()
let database: ReturnType<typeof createIntegrationDatabase>
let scope: ReturnType<typeof effectScope>

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  database = createIntegrationDatabase()
  scope = effectScope()
  local.clear()
  session.clear()
  local.set('quiz-user-id', 'participant-id')
  local.set('quiz-nickname', 'Before')
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onScopeDispose', onScopeDispose)
  vi.stubGlobal('onMounted', (callback: () => void) => callback())
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (text: { en: string }) => text.en }))
  vi.stubGlobal('useApiError', () => ({
    getErrorCode: () => undefined,
    getErrorMessage: () => 'request failed',
    getIssueMessage: () => 'validation failed',
  }))
  vi.stubGlobal('useIntervalFn', () => ({ pause: vi.fn(), resume: vi.fn() }))
  vi.stubGlobal('NicknameSchema', NicknameSchema)
  vi.stubGlobal('EmojiSchema', EmojiSchema)
  vi.stubGlobal('getValidationIssues', getValidationIssues)
  vi.stubGlobal('logger_error', vi.fn())
  for (const [
    name,
    values,
  ] of [
      [
        'localStorage',
        local,
      ],
      [
        'sessionStorage',
        session,
      ],
    ] as const) {
    vi.stubGlobal(name, {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
  }
})

afterEach(() => {
  scope.stop()
  database.dispose()
  vi.unstubAllGlobals()
})

describe('nickname-change answer ordering', () => {
  it.each([
    1,
    2,
  ])('keeps a rejoined answer after %i delayed nickname-change retractions', async (count) => {
    const question = await createQuestion({
      key: 'participant-question',
      question_text: { en: 'Question' },
      answer_options: [
        { text: { en: 'One' } },
        { text: { en: 'Two' } },
      ],
    })
    await publishQuestion(question.id, 'id')
    await submitAnswer({
      question_id: question.id,
      selected_answer: { en: 'One' },
      user_id: 'participant-id',
      user_nickname: 'Before',
    })
    const selectedAnswer = ref<number | null>(0)
    const confirmedAnswer = ref<number | null>(0)
    const answerReset = ref<{ questionId: string } | null>(null)
    const gates = Array.from({ length: count }, deferred)
    let retractIndex = 0
    const sendAnswer = vi.fn(async (body: Parameters<typeof submitAnswer>[0]) => submitAnswer(body))
    vi.stubGlobal('$fetch', async (path: string, { body }: { body: Parameters<typeof submitAnswer>[0] }) => {
      if (path === '/api/answers/retract') {
        await gates[retractIndex++]!.promise
        await retractAnswer(body.user_id, body.question_id)
      }
      else {
        await sendAnswer(body)
      }
      return { success: true }
    })
    const controller = scope.run(() => useQuizParticipant({
      activeQuestion: ref(question),
      selectedAnswer,
      confirmedAnswer,
      answerReset,
      refreshQuestion: async () => {},
      clearStoredAnswer: (questionId) => {
        answerReset.value = { questionId }
        selectedAnswer.value = null
        confirmedAnswer.value = null
        session.delete(`answer-${questionId}`)
      },
    }))!
    const changes: Promise<void>[] = []
    for (let index = 0; index < count; index++) {
      changes.push(controller.changeNickname())
      controller.nicknameInput.value = `After ${index + 1}`
      controller.setNickname()
    }
    selectedAnswer.value = 1
    const submission = controller.submitAnswer()
    await Promise.resolve()
    expect(sendAnswer).not.toHaveBeenCalled()
    expect(controller.answerPending.value).toBe(true)
    expect(confirmedAnswer.value).toBeNull()

    for (let index = 0; index < count; index++) {
      gates[index]!.resolve()
      await changes[index]
      if (index < count - 1) expect(sendAnswer).not.toHaveBeenCalled()
    }
    await submission

    await expect(getAnswersForQuestion(question.id)).resolves.toEqual([
      expect.objectContaining({ selected_answer: { en: 'Two' }, user_nickname: `After ${count}` }),
    ])
    expect(sendAnswer).toHaveBeenCalledOnce()
    expect(confirmedAnswer.value).toBe(1)
    expect(session.get(`answer-${question.id}`)).toBe('1')
    expect(controller.answerPending.value).toBe(false)
  })
})
