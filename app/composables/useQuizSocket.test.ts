import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import type { Question } from '~/types'

const socketState = vi.hoisted(() => ({ data: undefined as undefined | { value: string } }))

vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')
  const data = ref('')
  socketState.data = data

  return {
    useLocalStorage: () => ref<string | null>(null),
    useWebSocket: () => ({
      close: vi.fn(),
      data,
      open: vi.fn(),
      send: vi.fn(),
      status: ref('OPEN'),
    }),
  }
})

const {
  computed,
  nextTick,
  ref,
  watch,
} = await import('vue')
const storedAnswers = new Map<string, string>()

vi.stubGlobal('computed', computed)
vi.stubGlobal('getWsEndpoint', () => 'ws://localhost/_ws')
vi.stubGlobal('logger', vi.fn())
vi.stubGlobal('logger_error', vi.fn())
vi.stubGlobal('ref', ref)
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => storedAnswers.get(key) ?? null,
  removeItem: (key: string) => storedAnswers.delete(key),
  setItem: (key: string, value: string) => storedAnswers.set(key, value),
})
vi.stubGlobal('watch', watch)

const { useQuizSocket } = await import('./useQuizSocket')

beforeEach(() => {
  storedAnswers.clear()
  socketState.data!.value = ''
})

describe('useQuizSocket', () => {
  it('removes inactive reset answers without clearing the visible active selection', async () => {
    const { activeQuestion, selectedAnswer } = useQuizSocket()
    activeQuestion.value = { id: 'active-question' } as Question
    selectedAnswer.value = 1
    storedAnswers.set('answer-inactive-question', '0')

    socketState.data!.value = JSON.stringify({
      data: { questionId: 'inactive-question' },
      event: 'answers-reset',
    })
    await nextTick()

    expect(storedAnswers.has('answer-inactive-question')).toBe(false)
    expect(selectedAnswer.value).toBe(1)
  })
})
