import { ref, watch } from 'vue'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import type { Question } from '~/types'
import {
  EmojiSchema,
  getValidationIssues,
  NicknameSchema,
} from '#shared/utils/validation'
import { useQuizParticipant } from './useQuizParticipant'

const localValues = new Map<string, string>()
const sessionValues = new Map<string, string>()
const pause = vi.fn()
const resume = vi.fn()

const activeQuestion: Question = {
  answer_options: [
    { text: { en: 'One' } },
    { text: { en: 'Two' } },
  ],
  alreadyPublished: true,
  createdAt: '2026-09-05T00:00:00.000Z', authoredAt: null,
  id: 'question-id',
  is_active: true,
  is_disabled: false,
  is_locked: false,
  key: 'participant-question',
  question_text: { en: 'Participant question' },
  sortOrder: 0,
}

function createController(selectedAnswer = ref<number | null>(null)) {
  const question = ref<Question | null>(structuredClone(activeQuestion))
  const confirmedAnswer = ref<number | null>(null)
  const answerReset = ref<{ questionId: string } | null>(null)
  const clearStoredAnswer = vi.fn((questionId: string) => {
    answerReset.value = { questionId }
    selectedAnswer.value = null
    confirmedAnswer.value = null
    sessionValues.delete(`answer-${questionId}`)
  })
  const refreshQuestion = vi.fn().mockResolvedValue(undefined)
  const controller = useQuizParticipant({
    activeQuestion: question,
    refreshQuestion,
    selectedAnswer,
    confirmedAnswer,
    answerReset,
    clearStoredAnswer,
  })

  return {
    controller,
    confirmedAnswer,
    clearStoredAnswer,
    question,
    refreshQuestion,
    selectedAnswer,
  }
}

beforeEach(() => {
  localValues.clear()
  sessionValues.clear()
  pause.mockClear()
  resume.mockClear()
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onScopeDispose', vi.fn())
  vi.stubGlobal('onMounted', (callback: () => void) => callback())
  vi.stubGlobal('useApiError', () => ({
    getErrorCode: () => undefined,
    getErrorMessage: () => 'request failed',
    getIssueMessage: () => 'validation failed',
  }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (text: { en: string }) => text.en }))
  vi.stubGlobal('NicknameSchema', NicknameSchema)
  vi.stubGlobal('EmojiSchema', EmojiSchema)
  vi.stubGlobal('getValidationIssues', getValidationIssues)
  vi.stubGlobal('useIntervalFn', () => ({ pause, resume }))
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { emojiCooldownMs: 1500 } }))
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => localValues.get(key) ?? null,
    removeItem: (key: string) => localValues.delete(key),
    setItem: (key: string, value: string) => localValues.set(key, value),
  })
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => sessionValues.get(key) ?? null,
    removeItem: (key: string) => sessionValues.delete(key),
    setItem: (key: string, value: string) => sessionValues.set(key, value),
  })
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useQuizParticipant', () => {
  it('invalidates submissions and clears saved confirmation before changing nickname', async () => {
    let resolve!: () => void
    const pending = new Promise<void>((done) => { resolve = done })
    const fetch = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined)
    vi.stubGlobal('$fetch', fetch)
    localValues.set('quiz-user-id', 'participant-id')
    localValues.set('quiz-nickname', 'Participant')
    sessionValues.set('answer-question-id', '1')
    const { controller, selectedAnswer, confirmedAnswer, clearStoredAnswer } = createController(ref(0))
    confirmedAnswer.value = 1
    const request = controller.submitAnswer()
    selectedAnswer.value = 1
    void controller.submitAnswer()
    const change = controller.changeNickname()

    expect(controller.userNickname.value).toBe('')
    expect(clearStoredAnswer).toHaveBeenCalledWith('question-id')
    expect(selectedAnswer.value).toBeNull()
    expect(confirmedAnswer.value).toBeNull()
    expect(sessionValues.has('answer-question-id')).toBe(false)
    resolve()
    await Promise.all([
      request,
      change,
    ])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(sessionValues.has('answer-question-id')).toBe(false)
    expect(confirmedAnswer.value).toBeNull()
    expect(controller.answerError.value).toBe('')
  })

  it('stores a nickname and submits the selected answer', async () => {
    const fetch = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('$fetch', fetch)
    localValues.set('quiz-user-id', 'participant-id')
    const { controller, selectedAnswer } = createController(ref(0))

    controller.nicknameInput.value = ' Alice '
    controller.setNickname()
    await controller.submitAnswer()

    expect(controller.userNickname.value).toBe('Alice')
    expect(localValues.get('quiz-nickname')).toBe('Alice')
    expect(fetch).toHaveBeenCalledWith('/api/answers/submit', {
      method: 'POST',
      body: {
        question_id: 'question-id',
        selected_answer: { en: 'One' },
        user_id: 'participant-id',
        user_nickname: 'Alice',
      },
    })
    expect(sessionValues.get('answer-question-id')).toBe(String(selectedAnswer.value))
  })

  it('submits quick emoji reactions and starts the cooldown', async () => {
    const fetch = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('$fetch', fetch)
    localValues.set('quiz-user-id', 'participant-id')
    const { controller } = createController()

    await controller.sendQuickEmoji('👏')

    expect(fetch).toHaveBeenCalledWith('/api/emojis/submit', {
      method: 'POST',
      body: {
        emoji: '👏',
        user_id: 'participant-id',
      },
    })
    expect(controller.isEmojiCooldown.value).toBe(true)
    expect(controller.cooldownTimerInSec.value).toBe(1.5)
    expect(resume).toHaveBeenCalledOnce()
  })
})
