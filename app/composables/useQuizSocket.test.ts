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
  it('restores only confirmed choices and preserves a same-question draft', () => {
    const { updateActiveQuestion, selectedAnswer, confirmedAnswer, questionVersion } = useQuizSocket()
    const question = { id: 'first', answer_options: [
      { text: { en: 'One' } },
      { text: { en: 'Two' } },
    ] } as Question
    storedAnswers.set('answer-first', '0')
    updateActiveQuestion(question)
    expect(selectedAnswer.value).toBe(0)
    expect(confirmedAnswer.value).toBe(0)
    selectedAnswer.value = 1
    const version = questionVersion.value
    updateActiveQuestion({ ...question, is_locked: true })
    expect(selectedAnswer.value).toBe(1)
    expect(confirmedAnswer.value).toBe(0)
    expect(questionVersion.value).toBeGreaterThan(version)
    updateActiveQuestion(null)
    expect(selectedAnswer.value).toBeNull()
    expect(confirmedAnswer.value).toBeNull()
  })

  it.each([
    '-1',
    'invalid',
    '2',
    '0.5',
  ])('ignores an invalid saved choice (%s)', (saved) => {
    const { updateActiveQuestion, selectedAnswer, confirmedAnswer } = useQuizSocket()
    storedAnswers.set('answer-first', saved)
    updateActiveQuestion({ id: 'first', answer_options: [
      { text: { en: 'One' } },
    ] } as Question)
    expect(selectedAnswer.value).toBeNull()
    expect(confirmedAnswer.value).toBeNull()
  })

  it('clears confirmation and emits each reset, including inactive question resets', async () => {
    const { activeQuestion, confirmedAnswer, selectedAnswer, answerReset } = useQuizSocket()
    activeQuestion.value = { id: 'first' } as Question
    confirmedAnswer.value = 0
    selectedAnswer.value = 1
    storedAnswers.set('answer-first', '0')
    const resets: string[] = []
    watch(answerReset, reset => reset && resets.push(reset.questionId), { flush: 'sync' })
    for (const questionId of [
      'second',
      'second',
      'first',
    ]) {
      socketState.data!.value = JSON.stringify({ event: 'answers-reset', data: { questionId } })
      // Ensure identical consecutive reset messages also trigger the socket watcher.
      await nextTick()
      socketState.data!.value = 'pong'
      await nextTick()
      if (questionId === 'second') expect(confirmedAnswer.value).toBe(0)
    }
    expect(resets).toEqual([
      'second',
      'second',
      'first',
    ])
    expect(confirmedAnswer.value).toBeNull()
    expect(selectedAnswer.value).toBeNull()
    expect(storedAnswers.has('answer-first')).toBe(false)
  })

  it('clears active and inactive cached answers before restarting the same quiz', async () => {
    const { activeQuestion, selectedAnswer, results } = useQuizSocket()
    activeQuestion.value = { id: 'first-question' } as Question
    selectedAnswer.value = 1
    storedAnswers.set('answer-first-question', '1')
    storedAnswers.set('answer-second-question', '0')
    storedAnswers.set('unrelated-session-key', 'preserved')

    for (const questionId of [
      'first-question',
      'second-question',
    ]) {
      socketState.data!.value = JSON.stringify({ data: { questionId }, event: 'answers-reset' })
      await nextTick()
    }
    socketState.data!.value = JSON.stringify({ data: null, event: 'new-question' })
    await nextTick()
    socketState.data!.value = JSON.stringify({ data: null, event: 'results-update' })
    await nextTick()

    expect(activeQuestion.value).toBeNull()
    expect(selectedAnswer.value).toBeNull()
    expect(results.value).toBeNull()
    expect(storedAnswers).toEqual(new Map([
      [
        'unrelated-session-key',
        'preserved',
      ],
    ]))

    socketState.data!.value = JSON.stringify({ data: { id: 'first-question' }, event: 'new-question' })
    await nextTick()
    expect(activeQuestion.value?.id).toBe('first-question')
    expect(selectedAnswer.value).toBeNull()
  })

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
