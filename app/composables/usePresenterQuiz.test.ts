import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { PresenterCurrentState, Question } from '~/types'
import { createPresenterQuizController, type PresenterQuizApi } from './usePresenterQuiz'

function question(key: string, isDisabled = false): Question {
  return {
    alreadyPublished: false,
    answer_options: [
      { text: { en: key } },
    ],
    createdAt: '',
    id: key,
    is_disabled: isDisabled,
    is_locked: false,
    key,
    question_text: { en: key },
    sortOrder: 0,
  }
}

function state(key?: string, isLocked = false): PresenterCurrentState {
  return {
    currentQuestion: key
      ? {
        answer_options: [
          { count: 0, percent: 0, text: { en: key } },
        ],
        createdAt: '',
        id: key,
        index: 1,
        is_active: true,
        is_locked: isLocked,
        key,
        question_text: { en: key },
        totalQuestions: 2,
      }
      : null,
    hasActiveQuestion: Boolean(key),
    receivedAnswers: 0,
    receivedAnswersPercent: 0,
    totalUsers: 0,
  }
}

function setup(initialState = state()) {
  let current = initialState
  const calls: string[] = []
  const api: PresenterQuizApi = {
    async getCurrentState() {
      calls.push('state')
      return current
    },
    async getQuestions() {
      calls.push('questions')
      return [
        question('one'),
        question('disabled', true),
        question('two'),
      ]
    },
    async publishQuestion(key) {
      calls.push(`publish:${key}`)
      current = state(key)
    },
    async toggleQuestionLock(questionId) {
      calls.push(`toggle:${questionId}`)
      current = state(questionId, !current.currentQuestion?.is_locked)
    },
    async unpublishActiveQuestion() {
      calls.push('unpublish')
      current = state()
    },
  }
  const emitBoundary = vi.fn()
  const controller = createPresenterQuizController({ api, emitBoundary })
  return { api, calls, controller, emitBoundary }
}

describe('createPresenterQuizController', () => {
  beforeEach(() => {
    vi.stubGlobal('logger_error', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('publishes and opens question one when no question is active', async () => {
    const { calls, controller } = setup()
    await controller.initialize()

    expect(controller.questions.value.map(item => item.key)).toEqual([
      'one',
      'two',
    ])
    expect(controller.step.value).toEqual({ kind: 'question', phase: 'open', questionIndex: 0 })
    expect(calls).toEqual([
      'questions',
      'state',
      'state',
      'publish:one',
      'state',
    ])
  })

  it('resumes an active locked question without redundant mutations', async () => {
    const { calls, controller } = setup(state('two', true))
    await controller.initialize()

    expect(controller.step.value).toEqual({ kind: 'question', phase: 'reveal', questionIndex: 1 })
    expect(calls).toEqual([
      'questions',
      'state',
    ])
  })

  it('confirms lock, publish, unlock, and unpublish before changing steps', async () => {
    const { calls, controller } = setup()
    await controller.initialize()
    calls.length = 0

    await controller.navigate('next')
    await controller.navigate('next')
    await controller.navigate('previous')
    await controller.navigate('next')
    await controller.navigate('next')
    await controller.navigate('next')

    expect(calls).toEqual([
      'state',
      'toggle:one',
      'state',
      'state',
      'publish:two',
      'state',
      'state',
      'publish:one',
      'state',
      'toggle:one',
      'state',
      'state',
      'publish:two',
      'state',
      'state',
      'toggle:two',
      'state',
      'state',
      'unpublish',
      'state',
    ])
    expect(controller.step.value).toEqual({ kind: 'leaderboard' })
  })

  it('unpublishes before the previous boundary, then restores the open step before reveal', async () => {
    const { calls, controller, emitBoundary } = setup(state('one'))
    await controller.initialize()
    controller.currentState.value = state('one')
    calls.length = 0

    const first = controller.navigate('previous')
    const second = controller.navigate('next')
    await Promise.all([
      first,
      second,
    ])

    expect(emitBoundary).toHaveBeenCalledWith('previous')
    expect(calls).toEqual([
      'state',
      'unpublish',
      'state',
    ])
    expect(controller.step.value).toEqual({ kind: 'question', phase: 'open', questionIndex: 0 })

    calls.length = 0
    await controller.activate()

    expect(calls).toEqual([
      'state',
      'publish:one',
      'state',
    ])
    expect(controller.currentState.value).toEqual(state('one'))

    calls.length = 0
    await controller.navigate('next')

    expect(calls).toEqual([
      'state',
      'toggle:one',
      'state',
    ])
    expect(controller.step.value).toEqual({ kind: 'question', phase: 'reveal', questionIndex: 0 })
  })

  it('polls with a configurable interval and restarts the timer', async () => {
    vi.useFakeTimers()
    const { calls, controller } = setup(state('one'))
    await controller.initialize()
    calls.length = 0
    controller.startPolling(500)

    await vi.advanceTimersByTimeAsync(499)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual([
      'state',
    ])

    calls.length = 0
    controller.startPolling(1000)
    await vi.advanceTimersByTimeAsync(999)
    expect(calls).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual([
      'state',
    ])
    controller.stopPolling()
  })

  it('keeps only one polling refresh request in flight', async () => {
    vi.useFakeTimers()
    const { api, controller } = setup(state('one'))
    await controller.initialize()

    let resolveRefresh!: (value: PresenterCurrentState) => void
    const pendingRefresh = new Promise<PresenterCurrentState>((resolve) => {
      resolveRefresh = resolve
    })
    const getCurrentState = vi.fn()
      .mockReturnValueOnce(pendingRefresh)
      .mockResolvedValue(state('one'))
    api.getCurrentState = getCurrentState
    controller.startPolling(100)

    await vi.advanceTimersByTimeAsync(100)
    expect(getCurrentState).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(300)
    expect(getCurrentState).toHaveBeenCalledTimes(1)

    resolveRefresh(state('one'))
    await pendingRefresh
    await vi.advanceTimersByTimeAsync(100)
    expect(getCurrentState).toHaveBeenCalledTimes(2)
    controller.stopPolling()
  })

  it('ignores a refresh response started before navigation', async () => {
    let current = state('one')
    let resolveRefresh!: (value: PresenterCurrentState) => void
    const pendingRefresh = new Promise<PresenterCurrentState>((resolve) => {
      resolveRefresh = resolve
    })
    const getCurrentState = vi.fn()
      .mockResolvedValueOnce(current)
      .mockReturnValueOnce(pendingRefresh)
      .mockImplementation(async () => current)
    const controller = createPresenterQuizController({
      api: {
        getCurrentState,
        getQuestions: async () => [
          question('one'),
        ],
        publishQuestion: vi.fn(),
        toggleQuestionLock: async () => {
          current = state('one', true)
        },
        unpublishActiveQuestion: vi.fn(),
      },
      emitBoundary: vi.fn(),
    })
    await controller.initialize()

    const refresh = controller.refresh()
    await controller.navigate('next')
    resolveRefresh(state('one'))
    await refresh

    expect(controller.currentState.value).toEqual(state('one', true))
    expect(controller.step.value).toEqual({ kind: 'question', phase: 'reveal', questionIndex: 0 })
  })

  it('disables only periodic polling when the interval is zero', async () => {
    vi.useFakeTimers()
    const { calls, controller } = setup(state('one'))
    await controller.initialize()
    calls.length = 0
    controller.startPolling(0)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls).toEqual([])

    await controller.refresh()
    expect(calls).toEqual([
      'state',
    ])
  })

  it('keeps the last successful state when polling fails', async () => {
    const { controller } = setup(state('one'))
    await controller.initialize()
    const previous = controller.currentState.value
    const failing = createPresenterQuizController({
      api: {
        getCurrentState: vi.fn().mockResolvedValueOnce(state('one')).mockRejectedValue(new Error('offline')),
        getQuestions: vi.fn().mockResolvedValue([
          question('one'),
        ]),
        publishQuestion: vi.fn(),
        toggleQuestionLock: vi.fn(),
        unpublishActiveQuestion: vi.fn(),
      },
      emitBoundary: vi.fn(),
    })
    await failing.initialize()
    await failing.refresh()

    expect(failing.currentState.value).toEqual(previous)
    expect(failing.errorKind.value).toBe('refresh')
  })
})
