import { effectScope, onScopeDispose, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Question } from '~/types'
import { useQuizAnswers } from './useQuizAnswers'

const scopes: ReturnType<typeof effectScope>[] = []
const stored = new Map<string, string>()
const fetch = vi.fn()

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function createController() {
  const activeQuestion = ref<Question | null>({
    id: 'first',
    is_locked: false,
    answer_options: [
      { text: { en: 'One' } },
      { text: { en: 'Two' } },
    ],
  } as Question)
  const selectedAnswer = ref<number | null>(0)
  const confirmedAnswer = ref<number | null>(null)
  const answerReset = ref<{ questionId: string } | null>(null)
  const refreshQuestion = vi.fn().mockResolvedValue(undefined)
  const scope = effectScope()
  scopes.push(scope)
  const controller = scope.run(() => useQuizAnswers({
    activeQuestion, selectedAnswer, confirmedAnswer, answerReset, refreshQuestion,
  }, ref('Participant')))!
  return { ...controller, activeQuestion, selectedAnswer, confirmedAnswer, answerReset, refreshQuestion, scope }
}

beforeEach(() => {
  stored.clear()
  fetch.mockReset()
  vi.stubGlobal('$fetch', fetch)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onScopeDispose', onScopeDispose)
  vi.stubGlobal('localStorage', { getItem: () => 'participant-id' })
  vi.stubGlobal('sessionStorage', { setItem: (key: string, value: string) => stored.set(key, value) })
  vi.stubGlobal('useApiError', () => ({
    getErrorCode: (error: { data?: { code?: string } }) => error?.data?.code,
    getErrorMessage: () => 'request failed',
  }))
})

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  vi.unstubAllGlobals()
})

describe('optimistic answer submissions', () => {
  it('keeps a failed draft and previous confirmation, then retries the same choice', async () => {
    const first = deferred()
    fetch.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ success: true })
    const state = createController()
    state.confirmedAnswer.value = 1
    stored.set('answer-first', '1')

    const request = state.submitAnswer()
    expect(state.answerPending.value).toBe(true)
    expect(state.answerError.value).toBe('')
    first.reject(new Error('offline'))
    await request

    expect(state.answerPending.value).toBe(false)
    expect(state.answerError.value).toBe('request failed')
    expect(state.selectedAnswer.value).toBe(0)
    expect(state.confirmedAnswer.value).toBe(1)
    expect(stored.get('answer-first')).toBe('1')
    expect(fetch).toHaveBeenCalledOnce()

    await state.submitAnswer()
    expect(fetch.mock.calls[1]![1].body).toEqual(fetch.mock.calls[0]![1].body)
    expect(state.answerError.value).toBe('')
    expect(state.confirmedAnswer.value).toBe(0)
    expect(stored.get('answer-first')).toBe('0')
  })

  it('serializes rapid changes and sends only the latest waiting snapshot', async () => {
    const first = deferred()
    const last = deferred()
    fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise)
    const state = createController()
    const request = state.submitAnswer()
    for (const index of [
      1,
      0,
      1,
    ]) {
      state.selectedAnswer.value = index
      void state.submitAnswer()
    }
    state.activeQuestion.value!.answer_options[1]!.text.en = 'Changed later'
    expect(fetch).toHaveBeenCalledOnce()

    first.resolve()
    await Promise.resolve()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1]![1].body).toMatchObject({ question_id: 'first', selected_answer: { en: 'Two' } })
    expect(state.confirmedAnswer.value).toBe(0)
    expect(state.answerPending.value).toBe(true)
    last.resolve()
    await request
    expect(state.confirmedAnswer.value).toBe(1)
    expect(stored.get('answer-first')).toBe('1')
    expect(state.answerPending.value).toBe(false)
  })

  it('does not let an older failure override a newer queued choice', async () => {
    const first = deferred()
    fetch.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ success: true })
    const state = createController()
    const request = state.submitAnswer()
    state.selectedAnswer.value = 1
    void state.submitAnswer()
    first.reject(new Error('offline'))
    await request

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(state.answerError.value).toBe('')
    expect(state.confirmedAnswer.value).toBe(1)
  })

  it.each([
    true,
    false,
  ])('isolates an old response after a question switch (success=%s)', async (success) => {
    const first = deferred()
    const second = deferred()
    fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const state = createController()
    const firstRequest = state.submitAnswer()
    state.selectedAnswer.value = 1
    void state.submitAnswer()
    state.activeQuestion.value = { ...state.activeQuestion.value!, id: 'second' }
    const secondRequest = state.submitAnswer()

    if (success) first.resolve()
    else first.reject({ data: { code: 'quiz.question_changed' } })
    await firstRequest

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(state.answerError.value).toBe('')
    expect(state.answerPending.value).toBe(true)
    expect(state.confirmedAnswer.value).toBeNull()
    expect(stored.get('answer-first')).toBe(success ? '0' : undefined)
    expect(stored.has('answer-second')).toBe(false)
    expect(state.refreshQuestion).not.toHaveBeenCalled()
    second.resolve()
    await secondRequest
    expect(stored.get('answer-second')).toBe('1')
  })

  it.each([
    true,
    false,
  ])('handles a late response when no question is active (success=%s)', async (success) => {
    const response = deferred()
    fetch.mockReturnValue(response.promise)
    const state = createController()
    const request = state.submitAnswer()
    state.activeQuestion.value = null
    state.selectedAnswer.value = null
    if (success) response.resolve()
    else response.reject(new Error('offline'))
    await request

    expect(stored.get('answer-first')).toBe(success ? '0' : undefined)
    expect(state.answerError.value).toBe('')
    expect(state.confirmedAnswer.value).toBeNull()
  })

  it.each([
    true,
    false,
  ])('invalidates pending and queued writes on reset (success=%s)', async (success) => {
    const response = deferred()
    fetch.mockReturnValue(response.promise)
    const state = createController()
    const request = state.submitAnswer()
    state.selectedAnswer.value = 1
    void state.submitAnswer()
    state.answerReset.value = { questionId: 'first' }
    if (success) response.resolve()
    else response.reject({ data: { code: 'quiz.question_locked' } })
    await request

    expect(fetch).toHaveBeenCalledOnce()
    expect(stored.size).toBe(0)
    expect(state.confirmedAnswer.value).toBeNull()
    expect(state.answerPending.value).toBe(false)
    expect(state.answerError.value).toBe('')
    expect(state.refreshQuestion).not.toHaveBeenCalled()
  })

  it('queues a fresh post-reset submission behind the invalidated request', async () => {
    const response = deferred()
    fetch.mockReturnValueOnce(response.promise).mockResolvedValueOnce({ success: true })
    const state = createController()
    const request = state.submitAnswer()
    state.answerReset.value = { questionId: 'first' }
    state.selectedAnswer.value = 1
    void state.submitAnswer()
    response.resolve()
    await request

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(state.confirmedAnswer.value).toBe(1)
    expect(stored.get('answer-first')).toBe('1')
  })

  it('refreshes a locked question and does not send the queued choice', async () => {
    const response = deferred()
    fetch.mockReturnValueOnce(response.promise)
    const state = createController()
    state.refreshQuestion.mockImplementation(async () => { state.activeQuestion.value!.is_locked = true })
    const request = state.submitAnswer()
    state.selectedAnswer.value = 1
    void state.submitAnswer()
    response.reject({ data: { code: 'quiz.question_locked' } })
    await request

    expect(state.refreshQuestion).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledOnce()
    expect(state.answerError.value).toBe('request failed')
    expect(state.selectedAnswer.value).toBe(1)
    expect(state.answerPending.value).toBe(false)
  })

  it('keeps the failure visible when its authoritative refresh also fails', async () => {
    fetch.mockRejectedValue({ data: { code: 'quiz.question_changed' } })
    const state = createController()
    state.refreshQuestion.mockRejectedValue(new Error('offline'))
    await expect(state.submitAnswer()).resolves.toBeUndefined()
    expect(state.answerError.value).toBe('request failed')
  })

  it('ignores responses and drops queued choices after disposal', async () => {
    const response = deferred()
    fetch.mockReturnValue(response.promise)
    const state = createController()
    const request = state.submitAnswer()
    state.selectedAnswer.value = 1
    void state.submitAnswer()
    state.scope.stop()
    response.resolve()
    await request
    expect(stored.size).toBe(0)
    expect(fetch).toHaveBeenCalledOnce()
  })
})
