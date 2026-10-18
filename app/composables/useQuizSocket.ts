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

  /** Invalidates outstanding local submissions and clears a question's saved confirmation. */
  function clearStoredAnswer(questionId: string) {
    answerReset.value = { questionId }
    if (activeQuestion.value?.id === questionId) {
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
        updateActiveQuestion(parsed.data)
      }
      else if (parsed.event === 'lock-status') {
        if (activeQuestion.value && activeQuestion.value.id === parsed.data.questionId) {
          questionVersion.value++
          activeQuestion.value.is_locked = parsed.data.is_locked
        }
      }
      else if (parsed.event === 'answers-reset') {
        clearStoredAnswer(parsed.data.questionId)
      }
      else if (parsed.event === 'results-update') {
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
  })

  return {
    status,
    activeQuestion,
    answerReset,
    clearStoredAnswer,
    confirmedAnswer,
    questionVersion,
    selectedAnswer,
    updateActiveQuestion,
    results,
    send,
    open,
    close,
  }
}
