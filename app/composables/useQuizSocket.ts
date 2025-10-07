import { useWebSocket, useLocalStorage } from '@vueuse/core'
import { createId } from '@paralleldrive/cuid2'
import type { Question, Results } from '~/types'

export const useQuizSocket = () => {
  const config = useRuntimeConfig()

  const activeQuestion = ref<Question | null>(null)
  const selectedAnswer = ref('')
  const results = ref<Results | null>(null)
  const userId = useLocalStorage<string | null>('quiz-user-id', null)

  const wsEndpoint = computed(() => {
    if (import.meta.client) {
      if (!userId.value)
        userId.value = createId()

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = config.public.wsUrl || window.location.host
      return config.public.wsUrl
        ? `${config.public.wsUrl}/_ws/default?userId=${userId.value}`
        : `${protocol}//${host}/_ws/default?userId=${userId.value}`
    }
    return ''
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
    send,
    open,
    close,
  }
}