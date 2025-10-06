import { useWebSocket } from '@vueuse/core'
import { createId } from '@paralleldrive/cuid2'
import type { Question, Results } from '~/types'

export const useQuizSocket = () => {
  const config = useRuntimeConfig()

  const activeQuestion = ref<Question | null>(null)
  const selectedAnswer = ref('')
  const results = ref<Results | null>(null)

  // Generate or retrieve a unique user ID
  let userId = localStorage.getItem('quiz-user-id')
  if (!userId) {
    userId = createId()
    localStorage.setItem('quiz-user-id', userId)
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = config.public.wsUrl || window.location.host
  const wsEndpoint = config.public.wsUrl
    ? `${config.public.wsUrl}/_ws/default?userId=${userId}`
    : `${protocol}//${host}/_ws/default?userId=${userId}`

  const { status, data, send, open, close } = useWebSocket(wsEndpoint, {
    autoReconnect: true,
    heartbeat: {
      message: 'ping',
      interval: 30000,
    },
  })

  watch(data, (newMessage) => {
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
      console.error('WebSocket message error:', error)
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