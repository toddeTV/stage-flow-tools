import { useWebSocket, useLocalStorage } from '@vueuse/core'
import { createId } from '@paralleldrive/cuid2'
import type { Question, Results, UserQuestion } from '~/types'

export const useQuizSocket = (channel = 'default') => {
  const activeQuestion = ref<UserQuestion | Question | null>(null)
  const selectedAnswer = ref('')
  const results = ref<Results | null>(null)
  const totalConnections = ref(0)
  const userId = useLocalStorage<string | null>('quiz-user-id', null)

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
        activeQuestion.value = parsed.data
        selectedAnswer.value = ''
        sessionStorage.removeItem(`answer-${parsed.data.id}`)
      }
      else if (parsed.event === 'lock-status') {
        if (activeQuestion.value && activeQuestion.value.id === parsed.data.questionId) {
          activeQuestion.value.is_locked = parsed.data.is_locked
        }
      }
      else if (parsed.event === 'results-update') {
        results.value = parsed.data
      }
      else if (parsed.event === 'connections-update') {
        totalConnections.value = parsed.data.totalConnections
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