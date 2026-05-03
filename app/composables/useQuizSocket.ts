import { useWebSocket, useLocalStorage } from '@vueuse/core'
import { createId } from '@paralleldrive/cuid2'
import type { Question, Results } from '~/types'

export const useQuizSocket = (channel = 'default') => {
  const activeQuestion = ref<Question | null>(null)
  const selectedAnswer = ref<number | null>(null)
  const results = ref<Results | null>(null)
  const totalConnections = ref(0)
  const userId = useLocalStorage<string | null>('quiz-user-id', null)

  /**
   * Clear selected answer state and remove the client-side stored answer for a question.
   * @param questionId Question identifier used for the session storage key.
   */
  function clearStoredAnswer(questionId: string) {
    selectedAnswer.value = null

    if (import.meta.client) {
      sessionStorage.removeItem(`answer-${questionId}`)
    }
  }

  /**
   * Restore a stored answer for a question on the client and fall back to `null` when invalid.
   * @param questionId Question identifier used for the session storage key.
   * @returns void
   */
  function restoreStoredAnswer(questionId: string) {
    if (!import.meta.client) {
      selectedAnswer.value = null
      return
    }

    const savedAnswer = sessionStorage.getItem(`answer-${questionId}`)
    const parsedAnswer = savedAnswer === null ? Number.NaN : Number(savedAnswer)

    selectedAnswer.value = Number.isInteger(parsedAnswer) && parsedAnswer >= 0
      ? parsedAnswer
      : null
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
        const previousQuestionId = activeQuestion.value?.id
        activeQuestion.value = parsed.data

        if (!parsed.data) {
          selectedAnswer.value = null
        }
        else if (previousQuestionId !== parsed.data.id) {
          restoreStoredAnswer(parsed.data.id)
        }
      }
      else if (parsed.event === 'lock-status') {
        if (activeQuestion.value && activeQuestion.value.id === parsed.data.questionId) {
          activeQuestion.value.is_locked = parsed.data.is_locked
        }
      }
      else if (parsed.event === 'answers-reset') {
        if (activeQuestion.value && activeQuestion.value.id === parsed.data.questionId) {
          clearStoredAnswer(parsed.data.questionId)
        }
      }
      else if (parsed.event === 'results-update') {
        results.value = parsed.data
      }
      else if (parsed.event === 'connections-update') {
        totalConnections.value = parsed.data.totalConnections
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
  })

  return {
    status,
    activeQuestion,
    selectedAnswer,
    results,
    totalConnections,
    send,
    open,
    close,
  }
}
