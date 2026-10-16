import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { PresenterCurrentState, Question } from '~/types'
import { createPresenterQuizController, type PresenterQuizOptions } from './controller'

function setup(options: Partial<PresenterQuizOptions> = {}) {
  const rows: Question[] = [
    'one',
    'disabled',
    'two',
    'three',
  ].map((key, sortOrder) => ({
    key, id: key, sortOrder, alreadyPublished: false, is_disabled: key === 'disabled',
    is_locked: false, is_active: false, createdAt: '', authoredAt: null, question_text: { en: key },
    answer_options: [
      { text: { en: 'Yes' } },
    ],
  }))
  const counts = new Map<string, number>()
  function state(key?: string): PresenterCurrentState {
    const question = key ? rows.find(row => row.key === key) : rows.find(row => row.is_active)
    return {
      hasActiveQuestion: question?.is_active ?? false, totalUsers: 4,
      receivedAnswers: counts.get(question?.key ?? '') ?? 0, receivedAnswersPercent: 50,
      currentQuestion: question ? {
        ...question, is_active: question.is_active ?? false, index: 1, totalQuestions: rows.length,
        answer_options: [
          { text: { en: 'Yes' }, count: counts.get(question.key) ?? 0, percent: 100 },
        ],
      } : null,
    }
  }
  const api = {
    getQuestions: vi.fn(async () => rows.map(row => ({ ...row }))),
    getCurrentState: vi.fn(async (key?: string) => state(key)),
    publishQuestion: vi.fn(async (key: string) => {
      for (const row of rows) row.is_active = row.key === key
      rows.find(row => row.key === key)!.alreadyPublished = true
    }),
    toggleQuestionLock: vi.fn(async (id: string, locked?: boolean) => {
      const row = rows.find(row => row.id === id)!
      row.is_locked = locked ?? !row.is_locked
    }),
    unpublishActiveQuestion: vi.fn(async (expectedKey?: string) => {
      const row = rows.find(row => row.is_active)
      if (row && (!expectedKey || row.key === expectedKey)) row.is_active = false
    }),
  }
  const emitBoundary = vi.fn()
  const controller = createPresenterQuizController({ api, emitBoundary, options })
  return { api, rows, counts, controller, emitBoundary }
}

beforeEach(() => vi.stubGlobal('logger_error', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

describe('selected Presenter flow', () => {
  it.each([
    { questionKey: 'two', expected: [
      'two',
      'three',
    ] },
    { questionKey: 'one', questionCount: 2, expected: [
      'one',
      'two',
    ] },
    { questionKey: 'two', questionCount: 1, expected: [
      'two',
    ] },
  ])('selects an ordered enabled block: $questionKey / $questionCount', async ({ expected, ...options }) => {
    const { controller } = setup(options)
    await controller.initialize()
    expect(controller.questions.value.map(row => row.key)).toEqual(expected)
  })
  it('starts at the explicit key despite another active question and caps the count at the end', async () => {
    const { controller, rows } = setup({ questionKey: 'two', questionCount: 20 })
    rows[3]!.is_active = true
    await controller.initialize()
    expect(controller.questions.value.map(row => row.key)).toEqual([
      'two',
      'three',
    ])
    expect(controller.currentQuestion.value?.key).toBe('two')
  })
  it('starts a count-only block at the active question', async () => {
    const { controller, rows } = setup({ questionCount: 1 })
    rows[2]!.is_active = true
    await controller.initialize()
    expect(controller.questions.value.map(row => row.key)).toEqual([
      'two',
    ])
  })
  it.each([
    'missing',
    'disabled',
  ])('rejects an unavailable entry without writes: %s', async (questionKey) => {
    const { controller, api } = setup({ questionKey })
    expect(await controller.initialize()).toBe(false)
    expect(controller.errorKind.value).toBe('selection')
    expect(api.publishQuestion).not.toHaveBeenCalled()
    expect(api.unpublishActiveQuestion).not.toHaveBeenCalled()
  })
  it.each([
    0,
    -1,
    1.5,
  ])('rejects invalid counts without writes: %s', async (questionCount) => {
    const { controller, api } = setup({ questionCount })
    await controller.initialize()
    expect(controller.errorKind.value).toBe('selection')
    expect(api.publishQuestion).not.toHaveBeenCalled()
  })
  it.each([
    [
      true,
      true,
      [
        'leaderboard',
        'recap',
      ],
    ],
    [
      true,
      false,
      [
        'leaderboard',
      ],
    ],
    [
      false,
      true,
      [
        'recap',
      ],
    ],
    [
      false,
      false,
      [],
    ],
  ] as const)(
    'honors terminal flags in both directions (%s, %s)', async (showLeaderboard, showRecap, terminals) => {
      const { controller, emitBoundary } = setup({ questionCount: 1, showLeaderboard, showRecap })
      await controller.initialize()
      await controller.navigate('next')
      expect(controller.step.value?.kind).toBe('question')
      for (const kind of terminals) {
        await controller.navigate('next')
        expect(controller.step.value?.kind).toBe(kind)
      }
      await controller.navigate('next')
      expect(emitBoundary).toHaveBeenCalledWith('next')
      for (let index = terminals.length - 2; index >= 0; index--) {
        await controller.navigate('previous')
        expect(controller.step.value?.kind).toBe(terminals[index])
      }
      if (terminals.length) {
        await controller.navigate('previous')
        expect(controller.step.value).toMatchObject({ kind: 'question', phase: 'reveal' })
      }
    },
  )
  it('shows closed retained answers and reopens only through an explicit action', async () => {
    const { controller, api, rows, counts } = setup({ questionKey: 'two', questionCount: 1 })
    rows[2]!.alreadyPublished = true
    counts.set('two', 3)
    await controller.initialize()
    await controller.activate()
    expect(api.publishQuestion).not.toHaveBeenCalled()
    expect(controller.step.value).toMatchObject({ phase: 'reveal' })
    expect(controller.currentState.value?.receivedAnswers).toBe(3)
    await controller.reopen()
    expect(api.publishQuestion).toHaveBeenCalledWith('two')
    expect(controller.currentState.value?.receivedAnswers).toBe(3)
    expect(controller.step.value).toMatchObject({ phase: 'open' })
  })
  it.each([
    'quiz',
    'status',
  ] as const)('keeps explicitly closed %s voting closed through polling and focus', async (mode) => {
    const { controller, api, counts, rows } = setup({ mode })
    await controller.initialize()
    counts.set('one', 3)
    await controller.close()
    expect(controller.currentState.value?.receivedAnswers).toBe(3)

    await controller.refresh()
    await controller.activate()
    expect(controller.currentState.value).toMatchObject({
      receivedAnswers: 3, currentQuestion: { key: 'one', is_active: false },
    })
    expect(api.publishQuestion).toHaveBeenCalledTimes(1)
    expect(api.toggleQuestionLock).not.toHaveBeenCalled()

    // Another admin's selection must survive focus on this closed Presenter.
    rows[2]!.is_active = true
    await controller.refresh()
    await controller.activate()
    expect(rows[2]!.is_active).toBe(true)
    expect(controller.currentState.value?.receivedAnswers).toBe(3)
    expect(api.publishQuestion).toHaveBeenCalledTimes(1)

    await controller.reopen()
    expect(controller.currentState.value).toMatchObject({
      receivedAnswers: 3, currentQuestion: { key: 'one', is_active: true, is_locked: false },
    })
    expect(api.publishQuestion).toHaveBeenCalledTimes(2)
    expect(controller.step.value).toMatchObject({ phase: 'open' })
  })
  it.each([
    'quiz',
    'status',
  ] as const)('resumes the usual %s flow after explicit navigation from a closed question', async (mode) => {
    const { controller, api, rows } = setup({ mode })
    await controller.initialize()
    await controller.close()
    await controller.navigate('next')
    expect(controller.currentQuestion.value?.key).toBe('two')
    rows[2]!.is_active = false
    await controller.activate()
    expect(rows[2]!.is_active).toBe(true)
    expect(api.publishQuestion.mock.calls).toEqual([
      [
        'one',
      ],
      [
        'two',
      ],
      [
        'two',
      ],
    ])
  })
  it('allows a new ordinary selection to start voting after an explicit close', async () => {
    const { controller, api } = setup()
    await controller.initialize()
    await controller.close()
    await controller.initialize({ mode: 'status' })
    expect(api.publishQuestion).toHaveBeenCalledTimes(2)
    expect(controller.currentState.value?.currentQuestion?.is_active).toBe(true)
  })
  it('keeps closure after a failed reopen instead of retrying it on focus', async () => {
    const { controller, api, counts } = setup()
    await controller.initialize()
    counts.set('one', 3)
    await controller.close()
    api.publishQuestion.mockRejectedValueOnce(new Error('offline'))
    expect(await controller.reopen()).toBe(false)
    await controller.refresh()
    await controller.activate()
    expect(api.publishQuestion).toHaveBeenCalledTimes(2)
    expect(controller.currentState.value).toMatchObject({
      receivedAnswers: 3, currentQuestion: { is_active: false },
    })
  })
  it('keeps confirmed closure when the following state read fails', async () => {
    const { controller, api, counts } = setup()
    await controller.initialize()
    counts.set('one', 3)
    api.getCurrentState.mockRejectedValueOnce(new Error('offline'))
    expect(await controller.close()).toBe(false)
    expect(api.unpublishActiveQuestion).toHaveBeenCalledWith('one')
    await controller.refresh()
    await controller.activate()
    expect(api.publishQuestion).toHaveBeenCalledTimes(1)
    expect(controller.currentState.value).toMatchObject({
      receivedAnswers: 3, currentQuestion: { is_active: false },
    })
  })
  it('keeps status voting open and goes straight to the boundary', async () => {
    const { controller, api, emitBoundary } = setup({
      questionCount: 1, mode: 'status', showLeaderboard: false, showRecap: false,
    })
    await controller.initialize()
    await controller.navigate('next')
    expect(api.toggleQuestionLock).not.toHaveBeenCalled()
    expect(api.unpublishActiveQuestion).toHaveBeenCalledWith('one')
    expect(emitBoundary).toHaveBeenCalledWith('next')
  })
  it('opens the first question in the usual flow even when it has stored results', async () => {
    const { controller, rows } = setup()
    rows[0]!.alreadyPublished = true
    rows[0]!.is_locked = true
    await controller.initialize()
    expect(controller.step.value).toMatchObject({ phase: 'open' })
    expect(rows[0]!.is_active).toBe(true)
    expect(rows[0]!.is_locked).toBe(false)
  })
  it('unlocks an active status question without hiding its live results', async () => {
    const { controller, rows } = setup({ questionKey: 'two', mode: 'status' })
    rows[2]!.is_active = true
    rows[2]!.is_locked = true
    await controller.initialize()
    expect(controller.step.value).toMatchObject({ phase: 'open' })
    expect(controller.currentState.value?.currentQuestion?.is_locked).toBe(false)
  })
  it('does not advance when the server did not confirm the lock change', async () => {
    const { controller, api } = setup({ questionKey: 'one' })
    await controller.initialize()
    api.toggleQuestionLock.mockResolvedValueOnce(undefined)
    expect(await controller.navigate('next')).toBe(false)
    expect(controller.step.value).toMatchObject({ phase: 'open' })
    expect(controller.errorKind.value).toBe('sync')
  })
  it('does not acknowledge a publication that the server did not apply', async () => {
    const { controller, api } = setup({ parentManaged: true })
    api.publishQuestion.mockResolvedValueOnce(undefined)
    expect(await controller.select({ questionKey: 'one', mode: 'quiz' })).toBe(false)
    expect(controller.step.value).toBeNull()
    expect(controller.errorKind.value).toBe('selection')
    expect(api.toggleQuestionLock).not.toHaveBeenCalled()
  })
  it('does not close an unrelated question while traversing ending views', async () => {
    const { controller, rows, api } = setup()
    rows[3]!.is_active = true
    await controller.initialize()
    await controller.navigate('next')
    await controller.navigate('next')
    rows[2]!.is_active = true
    await controller.navigate('next')
    await controller.navigate('next')
    expect(api.unpublishActiveQuestion).toHaveBeenCalledTimes(1)
    expect(rows[2]!.is_active).toBe(true)
  })
  it('never writes from a read-only Presenter, including context, focus, controls and exit', async () => {
    const { controller, api, emitBoundary } = setup({ readOnly: true, parentManaged: true })
    await controller.select({ questionKey: 'two', questionCount: 1, mode: 'quiz' })
    await controller.activate()
    await controller.navigate('next')
    await controller.reopen()
    await controller.close()
    await controller.select(null)
    expect(api.publishQuestion).not.toHaveBeenCalled()
    expect(api.toggleQuestionLock).not.toHaveBeenCalled()
    expect(api.unpublishActiveQuestion).not.toHaveBeenCalled()
    expect(emitBoundary).not.toHaveBeenCalled()
  })
  it('closes only its owned question after a manual selection elsewhere', async () => {
    const { controller, api, rows } = setup({ parentManaged: true })
    await controller.select({ questionKey: 'one', mode: 'quiz' })
    rows[0]!.is_active = false
    rows[2]!.is_active = true
    await controller.select(null)
    expect(api.unpublishActiveQuestion).toHaveBeenCalledWith('one')
    expect(rows[2]!.is_active).toBe(true)
  })
  it('discards obsolete selection reads and serializes a publish already in flight before closing', async () => {
    const { controller, api } = setup({ parentManaged: true })
    let complete!: () => void
    const publish = api.publishQuestion.getMockImplementation()!
    api.publishQuestion.mockImplementationOnce(async (key) => {
      await new Promise<void>((resolve) => { complete = resolve })
      await publish(key)
    })
    const first = controller.select({ questionKey: 'one', mode: 'quiz' })
    await vi.waitFor(() => expect(api.publishQuestion).toHaveBeenCalledWith('one'))
    const obsolete = controller.select({ questionKey: 'two', mode: 'quiz' })
    const close = controller.select(null)
    complete()
    expect(await first).toBe(false)
    expect(await obsolete).toBe(false)
    expect(await close).toBe(true)
    expect(api.publishQuestion).toHaveBeenCalledTimes(1)
    expect(api.unpublishActiveQuestion).toHaveBeenCalledWith('one')
    expect(controller.step.value).toBeNull()
  })
  it('keeps the latest question when a previous context publication finishes late', async () => {
    const { controller, api } = setup({ parentManaged: true })
    let complete!: () => void
    const publish = api.publishQuestion.getMockImplementation()!
    api.publishQuestion.mockImplementationOnce(async (key) => {
      await new Promise<void>((resolve) => { complete = resolve })
      await publish(key)
    })
    const first = controller.select({ questionKey: 'one', mode: 'quiz' })
    await vi.waitFor(() => expect(api.publishQuestion).toHaveBeenCalledWith('one'))
    const latest = controller.select({ questionKey: 'two', questionCount: 1, mode: 'status' })
    complete()
    expect(await first).toBe(false)
    expect(await latest).toBe(true)
    expect(controller.currentState.value?.currentQuestion?.key).toBe('two')
    expect(controller.flow.value.mode).toBe('status')
    expect(api.unpublishActiveQuestion).toHaveBeenCalledWith('one')
  })
})
