import { computed, ref, shallowRef } from 'vue'
import type { PresenterCurrentState, Question } from '~/types'
import type { PresenterParameters } from '~/utils/presenter-parameters'
import {
  getInitialPresenterQuizStep,
  getNextPresenterQuizStep,
  getPreviousPresenterQuizStep,
  type PresenterQuizStep,
} from '~/utils/presenter-quiz-state'

export type PresenterErrorKind = 'load' | 'refresh' | 'sync' | 'selection'
export type PresenterSelection = { questionKey: string, questionCount?: number, mode: 'quiz' | 'status' }
export type PresenterQuizOptions = Pick<PresenterParameters,
  'questionKey' | 'questionCount' | 'mode' | 'readOnly' | 'parentManaged'
  | 'showLeaderboard' | 'showRecap' | 'invalidSelection'>
export interface PresenterQuizApi {
  getCurrentState: (key?: string) => Promise<PresenterCurrentState>
  getQuestions: () => Promise<Question[]>
  publishQuestion: (key: string) => Promise<unknown>
  toggleQuestionLock: (questionId: string, locked?: boolean) => Promise<unknown>
  unpublishActiveQuestion: (expectedKey?: string) => Promise<unknown>
}

/** Serializes confirmed writes; newer selections invalidate obsolete reads and pending writes. */
export function createPresenterQuizController({ api, emitBoundary, options = {} }: {
  api: PresenterQuizApi
  emitBoundary: (direction: 'next' | 'previous') => void
  options?: Partial<PresenterQuizOptions>
}) {
  const currentState = shallowRef<PresenterCurrentState | null>(null)
  const errorKind = ref<PresenterErrorKind | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const isTransitioning = ref(false)
  const questions = shallowRef<Question[]>([])
  const step = ref<PresenterQuizStep | null>(null)
  const flow = shallowRef(options)
  let ownedKey: string | undefined
  let explicitlyClosedKey: string | undefined
  let revision = 0
  let stopped = false
  let pending = Promise.resolve(true)
  let refreshing = false
  let pollingHandle: ReturnType<typeof setInterval> | undefined
  const currentQuestion = computed(() => step.value?.kind === 'question'
    ? questions.value[step.value.questionIndex] ?? null : null)
  const scoped = () => Boolean(flow.value.questionKey || flow.value.questionCount
    || flow.value.parentManaged || flow.value.readOnly || explicitlyClosedKey)
  const current = (expected: number) => !stopped && revision === expected

  function enqueue(
    operation: (expected: number) => Promise<void>,
    kind: PresenterErrorKind = 'sync',
    expected = revision,
  ) {
    pending = pending.then(async () => {
      if (!current(expected)) return false
      isTransitioning.value = true
      errorKind.value = null
      try {
        await operation(expected)
        return current(expected) && !errorKind.value
      }
      catch (error: unknown) {
        if (current(expected)) {
          logger_error('Presenter synchronization failed', error)
          errorKind.value = kind
        }
        return false
      }
      finally {
        isTransitioning.value = false
        isLoading.value = false
      }
    })
    return pending
  }

  async function closeOwned(expected: number, legacy = false) {
    if (flow.value.readOnly) return
    if (ownedKey) {
      await api.unpublishActiveQuestion(ownedKey)
      ownedKey = undefined
    }
    else if (legacy && current(expected)) {
      const state = await api.getCurrentState()
      if (current(expected) && state.currentQuestion?.is_active) {
        await api.unpublishActiveQuestion(state.currentQuestion.key)
      }
    }
  }

  async function syncQuestion(target: Extract<PresenterQuizStep, { kind: 'question' }>, expected: number) {
    const question = questions.value[target.questionIndex]
    if (!question) throw new Error('Presenter question is missing')
    let state = await api.getCurrentState(scoped() ? question.key : undefined)
    if (!current(expected)) return
    if (state.currentQuestion?.key !== question.key || !state.currentQuestion.is_active) {
      await api.publishQuestion(question.key)
      ownedKey = question.key
      if (!current(expected)) return
      state = await api.getCurrentState(scoped() ? question.key : undefined)
    }
    else ownedKey = question.key
    if (!current(expected)) return
    if (state.currentQuestion?.key !== question.key || !state.currentQuestion.is_active) {
      throw new Error('Presenter publication was not confirmed')
    }
    const locked = target.phase === 'reveal' && flow.value.mode !== 'status'
    if (state.currentQuestion?.is_locked !== locked) {
      await api.toggleQuestionLock(question.id, locked)
      if (!current(expected)) return
      state = await api.getCurrentState(scoped() ? question.key : undefined)
    }
    if (!current(expected)) return
    if (state.currentQuestion?.key !== question.key || !state.currentQuestion.is_active
      || state.currentQuestion.is_locked !== locked) {
      throw new Error('Presenter lock state was not confirmed')
    }
    currentState.value = state
  }

  async function syncStep(target: PresenterQuizStep, expected: number) {
    if (flow.value.readOnly) return
    if (target.kind === 'question') await syncQuestion(target, expected)
    else {
      await closeOwned(expected)
      if (current(expected)) currentState.value = await api.getCurrentState()
    }
  }

  function phase(state: PresenterCurrentState, question?: Question) {
    return flow.value.mode !== 'status' && (state.currentQuestion?.is_locked
      || ((state.currentQuestion?.alreadyPublished ?? question?.alreadyPublished) && !state.currentQuestion?.is_active))
      ? 'reveal' as const : 'open' as const
  }

  function invalidSelection() {
    errorKind.value = 'selection'
    step.value = null
    questions.value = []
    currentState.value = null
  }

  async function load(expected: number) {
    if (flow.value.invalidSelection) { invalidSelection(); return }
    const [
      allQuestions,
      state,
    ] = await Promise.all([
      api.getQuestions(),
      api.getCurrentState(),
    ])
    if (!current(expected)) return
    const enabled = allQuestions.filter(question => !question.is_disabled)
    const { questionKey, questionCount } = flow.value
    if ((questionKey && !enabled.some(question => question.key === questionKey))
      || (questionCount !== undefined && (!Number.isSafeInteger(questionCount) || questionCount < 1))) {
      invalidSelection()
      return
    }
    const start = questionKey
      ? enabled.findIndex(question => question.key === questionKey)
      : Math.max(0, enabled.findIndex(question => question.key === state.currentQuestion?.key))
    const selection = questionKey || questionCount !== undefined
      ? enabled.slice(start, questionCount === undefined ? undefined : start + questionCount) : enabled
    const initial = getInitialPresenterQuizStep(selection, state)
    // An explicit entry always starts at that key even if another question is active.
    if (initial?.kind === 'question' && (questionKey || questionCount !== undefined)) initial.questionIndex = 0
    const selectedQuestion = initial?.kind === 'question' ? selection[initial.questionIndex] : undefined
    const selectedState = scoped() && selectedQuestion ? await api.getCurrentState(selectedQuestion.key) : state
    if (!current(expected)) return
    if (ownedKey && ownedKey !== selectedQuestion?.key) await closeOwned(expected)
    if (!current(expected)) return
    questions.value = selection
    currentState.value = selectedState
    if (initial?.kind === 'question') {
      if (scoped()) initial.phase = phase(selectedState, selectedQuestion)
      const published = selectedState.currentQuestion?.alreadyPublished ?? selectedQuestion?.alreadyPublished
      const closed = scoped() && published && !selectedState.currentQuestion?.is_active
      if (!flow.value.readOnly && !closed) {
        const locked = initial.phase === 'reveal' && flow.value.mode !== 'status'
        if (!selectedState.currentQuestion?.is_active || selectedState.currentQuestion.key !== selectedQuestion?.key
          || selectedState.currentQuestion.is_locked !== locked) {
          await syncStep(initial, expected)
        }
        else ownedKey = selectedQuestion?.key
      }
    }
    else if (!flow.value.readOnly && state.hasActiveQuestion && !scoped()) {
      await closeOwned(expected, true)
      if (current(expected)) currentState.value = await api.getCurrentState()
    }
    if (!current(expected)) return
    step.value = initial
    isInitialized.value = true
  }

  function initialize(nextOptions = options) {
    explicitlyClosedKey = undefined
    flow.value = nextOptions
    const expected = ++revision
    isLoading.value = true
    return enqueue(load, 'load', expected)
  }

  function select(selection: PresenterSelection | null) {
    const expected = ++revision
    isLoading.value = true
    return enqueue(async () => {
      if (selection) {
        explicitlyClosedKey = undefined
        flow.value = { ...options, ...selection, parentManaged: true }
        await load(expected)
      }
      else {
        await closeOwned(expected)
        if (!current(expected)) return
        explicitlyClosedKey = undefined
        step.value = null
        questions.value = []
        currentState.value = null
        isInitialized.value = true
      }
    }, 'selection', expected)
  }

  async function refresh() {
    if (!isInitialized.value || isTransitioning.value || refreshing || !step.value) return
    refreshing = true
    const expected = revision
    try {
      const state = await api.getCurrentState(scoped() ? currentQuestion.value?.key : undefined)
      if (current(expected) && !isTransitioning.value) {
        currentState.value = state
        if (scoped() && step.value?.kind === 'question') {
          step.value.phase = phase(state, currentQuestion.value ?? undefined)
        }
        if (errorKind.value === 'refresh') errorKind.value = null
      }
    }
    catch (error: unknown) {
      if (current(expected)) {
        logger_error('Failed to refresh presenter state', error)
        errorKind.value = 'refresh'
      }
    }
    finally { refreshing = false }
  }

  function navigate(direction: 'next' | 'previous') {
    if (!step.value || isTransitioning.value || flow.value.readOnly) return Promise.resolve(false)
    isTransitioning.value = true
    const expected = ++revision
    return enqueue(async () => {
      if (!step.value) return
      const target = direction === 'next'
        ? getNextPresenterQuizStep(step.value, questions.value.length, flow.value)
        : getPreviousPresenterQuizStep(step.value, questions.value.length, flow.value)
      if (target.kind === 'boundary') {
        await closeOwned(expected)
        if (current(expected)) {
          explicitlyClosedKey = undefined
          emitBoundary(target.direction)
        }
      }
      else {
        await syncStep(target, expected)
        if (current(expected)) {
          explicitlyClosedKey = undefined
          step.value = target
        }
      }
    }, 'sync', expected)
  }

  function reopen() {
    if (!currentQuestion.value || isTransitioning.value || flow.value.readOnly) return Promise.resolve(false)
    isTransitioning.value = true
    const expected = ++revision
    return enqueue(async () => {
      if (step.value?.kind !== 'question') return
      const target = { ...step.value, phase: 'open' as const }
      await syncStep(target, expected)
      if (current(expected)) {
        explicitlyClosedKey = undefined
        step.value = target
      }
    }, 'sync', expected)
  }

  function close() {
    if (flow.value.readOnly || isTransitioning.value) return Promise.resolve(false)
    isTransitioning.value = true
    const expected = ++revision
    return enqueue(async () => {
      await closeOwned(expected)
      if (!current(expected)) return
      explicitlyClosedKey = currentQuestion.value?.key
      const state = await api.getCurrentState(explicitlyClosedKey)
      if (!current(expected)) return
      currentState.value = state
      if (step.value?.kind === 'question') {
        step.value.phase = phase(state, currentQuestion.value ?? undefined)
      }
    }, 'sync', expected)
  }

  function activate() {
    if (!isInitialized.value || !step.value || isTransitioning.value) return Promise.resolve(false)
    if (scoped()) return refresh()
    isTransitioning.value = true
    const expected = ++revision
    return enqueue(async () => { if (step.value) await syncStep(step.value, expected) }, 'sync', expected)
  }

  function stopPolling() { clearInterval(pollingHandle); pollingHandle = undefined }
  function startPolling(intervalMs: number) {
    stopPolling()
    if (intervalMs > 0 && !stopped) pollingHandle = setInterval(() => void refresh(), intervalMs)
  }
  return {
    activate, close, currentQuestion, currentState, errorKind, flow, initialize, isInitialized,
    isLoading, isTransitioning, navigate, questions, refresh, reopen, select, startPolling, step,
    stopPolling,
    stop() { stopped = true; revision += 1; stopPolling() },
  }
}
