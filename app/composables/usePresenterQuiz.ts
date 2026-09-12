import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import type { Ref } from 'vue'
import type { PresenterCurrentState, Question } from '~/types'
import {
  getInitialPresenterQuizStep,
  getNextPresenterQuizStep,
  getPreviousPresenterQuizStep,
  type PresenterQuizStep,
} from '~/utils/presenter-quiz-state'

export type PresenterErrorKind = 'load' | 'refresh' | 'sync'
export type PresenterBoundaryMessage = {
  direction: 'next' | 'previous'
  type: 'stage-flow-tools:presenter-boundary'
}

export interface PresenterQuizApi {
  getCurrentState: () => Promise<PresenterCurrentState>
  getQuestions: () => Promise<Question[]>
  publishQuestion: (key: string) => Promise<unknown>
  toggleQuestionLock: (questionId: string) => Promise<unknown>
  unpublishActiveQuestion: () => Promise<unknown>
}

interface PresenterQuizControllerOptions {
  api: PresenterQuizApi
  emitBoundary: (direction: PresenterBoundaryMessage['direction']) => void
}

/** Owns server-confirmed presenter navigation and polling. */
export function createPresenterQuizController({ api, emitBoundary }: PresenterQuizControllerOptions) {
  const currentState = shallowRef<PresenterCurrentState | null>(null)
  const errorKind = ref<PresenterErrorKind | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const isTransitioning = ref(false)
  const questions = shallowRef<Question[]>([])
  const step = ref<PresenterQuizStep | null>(null)
  let pollingHandle: ReturnType<typeof setInterval> | undefined
  let refreshInFlight = false
  let syncRevision = 0

  const currentQuestion = computed(() => {
    if (step.value?.kind !== 'question') return null
    return questions.value[step.value.questionIndex] ?? null
  })

  async function fetchCurrentState() {
    const state = await api.getCurrentState()
    currentState.value = state
    return state
  }

  async function syncQuestionStep(target: Extract<PresenterQuizStep, { kind: 'question' }>) {
    const question = questions.value[target.questionIndex]
    if (!question) throw new Error('Presenter question is missing.')

    let state = await fetchCurrentState()
    if (state.currentQuestion?.key !== question.key) {
      await api.publishQuestion(question.key)
      state = await fetchCurrentState()
    }

    const shouldBeLocked = target.phase === 'reveal'
    if (state.currentQuestion?.key === question.key && state.currentQuestion.is_locked !== shouldBeLocked) {
      await api.toggleQuestionLock(question.id)
      await fetchCurrentState()
    }
  }

  async function syncLeaderboardStep() {
    const state = await fetchCurrentState()
    if (!state.hasActiveQuestion) return

    await api.unpublishActiveQuestion()
    await fetchCurrentState()
  }

  async function syncVisibleStep(target: PresenterQuizStep) {
    if (target.kind === 'question') await syncQuestionStep(target)
    else await syncLeaderboardStep()
  }

  async function initialize() {
    if (isLoading.value) return
    isLoading.value = true
    errorKind.value = null

    try {
      const [
        allQuestions,
        state,
      ] = await Promise.all([
        api.getQuestions(),
        api.getCurrentState(),
      ])
      questions.value = allQuestions.filter(question => !question.is_disabled)
      currentState.value = state
      const initialStep = getInitialPresenterQuizStep(questions.value, state)

      const initialQuestion = initialStep?.kind === 'question'
        ? questions.value[initialStep.questionIndex]
        : undefined
      if (initialStep && (!state.hasActiveQuestion || state.currentQuestion?.key !== initialQuestion?.key)) {
        await syncVisibleStep(initialStep)
      }
      else if (!initialStep && state.hasActiveQuestion) {
        await syncLeaderboardStep()
      }

      step.value = initialStep
      isInitialized.value = true
    }
    catch (error: unknown) {
      logger_error('Failed to initialize presenter quiz', error)
      errorKind.value = 'load'
    }
    finally {
      isLoading.value = false
    }
  }

  async function refresh() {
    if (!isInitialized.value || isTransitioning.value || refreshInFlight) return

    refreshInFlight = true
    const revision = syncRevision

    try {
      const state = await api.getCurrentState()
      if (!isTransitioning.value && revision === syncRevision) {
        currentState.value = state
        if (errorKind.value === 'refresh') errorKind.value = null
      }
    }
    catch (error: unknown) {
      logger_error('Failed to refresh presenter state', error)
      if (revision === syncRevision) errorKind.value = 'refresh'
    }
    finally {
      refreshInFlight = false
    }
  }

  async function activate() {
    if (!isInitialized.value || !step.value || isTransitioning.value) return

    syncRevision += 1
    isTransitioning.value = true
    errorKind.value = null

    try {
      await syncVisibleStep(step.value)
    }
    catch (error: unknown) {
      logger_error('Failed to reactivate presenter quiz step', error)
      errorKind.value = 'sync'
    }
    finally {
      isTransitioning.value = false
    }
  }

  async function navigate(direction: 'next' | 'previous') {
    if (!step.value || isTransitioning.value) return

    const transition = direction === 'next'
      ? getNextPresenterQuizStep(step.value, questions.value.length)
      : getPreviousPresenterQuizStep(step.value, questions.value.length)

    syncRevision += 1
    isTransitioning.value = true
    errorKind.value = null

    try {
      if (transition.kind === 'boundary') {
        if (transition.direction === 'previous') await syncLeaderboardStep()
        emitBoundary(transition.direction)
        return
      }

      await syncVisibleStep(transition)
      step.value = transition
    }
    catch (error: unknown) {
      logger_error('Failed to synchronize presenter quiz step', error)
      errorKind.value = 'sync'
    }
    finally {
      isTransitioning.value = false
    }
  }

  function startPolling(intervalMs: number) {
    stopPolling()
    if (!isInitialized.value || intervalMs <= 0) return
    pollingHandle = setInterval(() => void refresh(), intervalMs)
  }

  function stopPolling() {
    if (pollingHandle === undefined) return
    clearInterval(pollingHandle)
    pollingHandle = undefined
  }

  return {
    activate,
    currentQuestion,
    currentState,
    errorKind,
    initialize,
    isInitialized,
    isLoading,
    isTransitioning,
    navigate,
    questions,
    refresh,
    startPolling,
    step,
    stopPolling,
  }
}

/** Connects the presenter controller to same-origin APIs and page lifecycle. */
export function usePresenterQuiz(pollIntervalSeconds: Readonly<Ref<number>>) {
  const controller = createPresenterQuizController({
    api: {
      getCurrentState: () => $fetch<PresenterCurrentState>('/api/admin/presenter/current-state'),
      getQuestions: () => $fetch<Question[]>('/api/questions'),
      publishQuestion: key => $fetch('/api/questions/publish', { body: { key }, method: 'POST' }),
      toggleQuestionLock: questionId => $fetch('/api/questions/toggle-lock', { body: { questionId }, method: 'POST' }),
      unpublishActiveQuestion: () => $fetch('/api/questions/unpublish-active', { body: {}, method: 'POST' }),
    },
    emitBoundary(direction) {
      window.parent.postMessage({
        direction,
        type: 'stage-flow-tools:presenter-boundary',
      } satisfies PresenterBoundaryMessage, '*')
    },
  })

  const stopPollingIntervalWatch = watch(pollIntervalSeconds, (seconds) => {
    if (controller.isInitialized.value) controller.startPolling(seconds * 1000)
  })

  onMounted(() => {
    void controller.initialize().then(() => controller.startPolling(pollIntervalSeconds.value * 1000))
    window.addEventListener('focus', controller.activate)
  })

  onBeforeUnmount(() => {
    stopPollingIntervalWatch()
    controller.stopPolling()
    window.removeEventListener('focus', controller.activate)
  })

  return controller
}
