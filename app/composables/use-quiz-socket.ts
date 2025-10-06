import { useWebSocket } from '@vueuse/core'
import type { Question } from '~/types'

export const useQuizSocket = () => {
  const activeQuestion = ref<Question | null>(null)
  const selectedAnswer = ref('')

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const wsEndpoint = `${protocol}//${host}/_ws`

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
    }
    catch (error: unknown) {
      console.error('WebSocket message error:', error)
    }
  })

  return {
    status,
    activeQuestion,
    selectedAnswer,
    send,
    open,
    close,
  }
}