import { useWebSocket, useLocalStorage } from '@vueuse/core'
import { createId } from '@paralleldrive/cuid2'
import type { Question, Results } from '~/types'

export const useQuizSocket = (channel = 'default') => {
  const activeQuestion = ref<Question | null>(null)
  const selectedAnswer = ref<number | null>(null)
  const confirmedAnswer = ref<number | null>(null)
  const answerReset = ref<{ questionId: string } | null>(null)
  const questionVersion = ref(0)
  const results = ref<Results | null>(null)
  const userId = useLocalStorage<string | null>('quiz-user-id', null)
  let requestVersion = 0
  let snapshotVersion = 0
  let pendingSnapshot: AbortController | undefined
  let disposed = false

  function invalidateSnapshot() {
    snapshotVersion++
    pendingSnapshot?.abort()
  }

  /** Loads only this channel's snapshot; newer requests and live events take precedence. */
  async function refreshSnapshot() {
    const cancelled = { message: 'Snapshot cancelled' }
    if (disposed || (channel !== 'default' && channel !== 'results')) return cancelled

    pendingSnapshot?.abort()
    const controller = new AbortController()
    pendingSnapshot = controller
    const request = ++requestVersion
    const version = snapshotVersion
    const isCurrent = () => !controller.signal.aborted
      && request === requestVersion && version === snapshotVersion && !disposed

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const options = { signal: controller.signal, retry: false as const }
          const snapshot = channel === 'results'
            ? await $fetch<Results | { message: string }>('/api/results/current', options)
            : await $fetch<Question | { message: string }>('/api/questions/active', options)
          if (!isCurrent()) return cancelled

          if (channel === 'results') {
            results.value = 'question' in snapshot ? snapshot : null
          }
          else {
            updateActiveQuestion('id' in snapshot ? snapshot : null)
          }
          return snapshot
        }
        catch (error: unknown) {
          if (!isCurrent()) return cancelled
          const failure = error as { status?: number, response?: { status?: number } } | null
          const code = failure?.status ?? failure?.response?.status
          const retryable = code === undefined || code === 408 || code === 429 || (code >= 500 && code < 600)
          if (!retryable || attempt === 2) throw error

          await new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer)
              controller.signal.removeEventListener('abort', finish)
              resolve()
            }
            const timer = setTimeout(finish, (attempt + 1) * 1000)
            controller.signal.addEventListener('abort', finish, { once: true })
          })
          if (!isCurrent()) return cancelled
        }
      }
      return cancelled
    }
    finally {
      if (pendingSnapshot === controller) pendingSnapshot = undefined
    }
  }

  function refreshLiveState() {
    void refreshSnapshot().catch(() => {
      logger_error('Failed to refresh live state')
    })
  }

  /** Applies a partial event without abandoning an outstanding full question refresh. */
  function applyPartialQuestionUpdate(update: () => void) {
    const needsSnapshot = channel === 'default' && !disposed
      && pendingSnapshot !== undefined && !pendingSnapshot.signal.aborted
    update()
    if (needsSnapshot) refreshLiveState()
  }

  onScopeDispose(() => {
    disposed = true
    invalidateSnapshot()
  })

  /** Invalidates outstanding local submissions and clears a question's saved confirmation. */
  function clearStoredAnswer(questionId: string) {
    answerReset.value = { questionId }
    if (activeQuestion.value?.id === questionId) {
      if (channel === 'default') invalidateSnapshot()
      questionVersion.value++
      selectedAnswer.value = null
      confirmedAnswer.value = null
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`answer-${questionId}`)
    }
  }

  /**
   * Restore a stored answer for a question on the client and fall back to `null` when invalid.
   * @param question Question whose answer options bound the saved selection.
   * @returns void
   */
  function restoreStoredAnswer(question: Question) {
    const savedAnswer = typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem(`answer-${question.id}`)
    const parsedAnswer = savedAnswer === null ? Number.NaN : Number(savedAnswer)

    const valid = Number.isInteger(parsedAnswer) && parsedAnswer >= 0 && parsedAnswer < question.answer_options.length
    confirmedAnswer.value = valid
      ? parsedAnswer
      : null
    selectedAnswer.value = confirmedAnswer.value
  }

  /** Applies HTTP and socket question updates without overwriting same-question drafts. */
  function updateActiveQuestion(question: Question | null) {
    questionVersion.value++
    if (activeQuestion.value?.id !== question?.id) {
      if (question) {
        restoreStoredAnswer(question)
      }
      else {
        selectedAnswer.value = null
        confirmedAnswer.value = null
      }
    }
    activeQuestion.value = question
  }

  const wsEndpoint = computed(() => {
    if (import.meta.client && !userId.value) {
      userId.value = createId()
    }
    const params: Record<string, string> = { userId: userId.value || '' }
    if (channel) {
      params.channel = channel
    }
    return getWsEndpoint('default', params)
  })

  const { status, data, send, open, close } = useWebSocket(wsEndpoint, {
    autoReconnect: true,
    onConnected: refreshLiveState,
    onDisconnected: invalidateSnapshot,
    heartbeat: {
      message: 'ping',
      interval: 30000,
    },
  })

  watch(data, (newMessage) => {
    if (newMessage === 'pong')
      return

    try {
      const parsed = JSON.parse(newMessage)

      if (parsed.event === 'new-question') {
        if (channel === 'default') invalidateSnapshot()
        updateActiveQuestion(parsed.data)
      }
      else if (parsed.event === 'lock-status') {
        const question = activeQuestion.value
        if (question && question.id === parsed.data.questionId) {
          applyPartialQuestionUpdate(() => {
            if (channel === 'default') invalidateSnapshot()
            questionVersion.value++
            question.is_locked = parsed.data.is_locked
          })
        }
      }
      else if (parsed.event === 'answers-reset') {
        if (activeQuestion.value?.id === parsed.data.questionId) {
          applyPartialQuestionUpdate(() => clearStoredAnswer(parsed.data.questionId))
        }
        else {
          clearStoredAnswer(parsed.data.questionId)
        }
      }
      else if (parsed.event === 'results-update') {
        if (channel === 'results') invalidateSnapshot()
        results.value = parsed.data
      }
      else if (parsed.event === 'winner-selected' && parsed.data.userId === userId.value) {
        alert(`Congratulations, ${parsed.data.username}! You have won for option "${parsed.data.option}".`)
      }
      else {
        logger(`Unknown WebSocket event: ${parsed.event}`)
      }
    }
    catch (error: unknown) {
      logger_error('WebSocket message error:', error)
    }
  }, { flush: 'sync' })

  return {
    status,
    activeQuestion,
    answerReset,
    clearStoredAnswer,
    confirmedAnswer,
    questionVersion,
    refreshSnapshot,
    selectedAnswer,
    updateActiveQuestion,
    results,
    send,
    open,
    close,
  }
}
