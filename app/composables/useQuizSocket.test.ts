import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import type { Question, Results } from '~/types'

const socketState = vi.hoisted(() => ({
  data: undefined as undefined | { value: string },
  connect: () => {},
  disconnect: () => {},
}))

vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')
  return {
    useLocalStorage: () => ref<string | null>(null),
    useWebSocket: (_url: unknown, options: { onConnected: () => void, onDisconnected: () => void }) => {
      const data = ref('')
      const status = ref('CLOSED')
      socketState.data = data
      socketState.connect = () => { status.value = 'OPEN'; options.onConnected() }
      socketState.disconnect = () => { status.value = 'CLOSED'; options.onDisconnected() }
      return { close: vi.fn(), data, open: vi.fn(), send: vi.fn(), status }
    },
  }
})

const {
  computed,
  effectScope,
  nextTick,
  onScopeDispose,
  ref,
  watch,
} = await import('vue')
const storedAnswers = new Map<string, string>()

vi.stubGlobal('computed', computed)
vi.stubGlobal('getWsEndpoint', () => 'ws://localhost/_ws')
vi.stubGlobal('logger', vi.fn())
vi.stubGlobal('logger_error', vi.fn())
vi.stubGlobal('ref', ref)
vi.stubGlobal('onScopeDispose', onScopeDispose)
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => storedAnswers.get(key) ?? null,
  removeItem: (key: string) => storedAnswers.delete(key),
  setItem: (key: string, value: string) => storedAnswers.set(key, value),
})
vi.stubGlobal('watch', watch)

const { useQuizSocket: createQuizSocket } = await import('./useQuizSocket')
const scopes: ReturnType<typeof effectScope>[] = []
const snapshotFetch = vi.fn()

function useQuizSocket(channel = 'default') {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => createQuizSocket(channel))!
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function question(id = 'first', is_locked = false) {
  return { id, is_locked, answer_options: [
    { text: { en: 'One' } },
    { text: { en: 'Two' } },
  ] } as Question
}

function result(totalVotes = 1): Results {
  return { question: question(), results: { One: { count: totalVotes } }, totalVotes, totalConnections: 10 }
}

beforeEach(() => {
  storedAnswers.clear()
  snapshotFetch.mockReset().mockResolvedValue({ message: 'No active question' })
  vi.stubGlobal('$fetch', snapshotFetch)
  vi.mocked(logger_error).mockClear()
})

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  vi.useRealTimers()
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

describe('snapshot recovery', () => {
  it('loads on the first connection and recovers missed publications, locks and unpublication', async () => {
    const state = useQuizSocket()
    snapshotFetch.mockResolvedValueOnce(question())
    socketState.connect()
    await flushPromises()
    expect(state.activeQuestion.value?.id).toBe('first')

    for (const snapshot of [
      question('second'),
      question('second', true),
      { message: 'No active question' },
    ]) {
      socketState.disconnect()
      snapshotFetch.mockResolvedValueOnce(snapshot)
      socketState.connect()
      await flushPromises()
      expect(state.activeQuestion.value).toEqual('id' in snapshot ? snapshot : null)
    }
    expect(snapshotFetch.mock.calls.every(([
      url,
    ]) => url === '/api/questions/active')).toBe(true)
    expect(snapshotFetch).toHaveBeenCalledTimes(4)
  })

  it('recovers results and clears them when no question remains', async () => {
    const state = useQuizSocket('results')
    for (const snapshot of [
      result(),
      result(7),
      { message: 'No active question' },
    ]) {
      snapshotFetch.mockResolvedValueOnce(snapshot)
      socketState.connect()
      await flushPromises()
      expect(state.results.value).toEqual('question' in snapshot ? snapshot : null)
      socketState.disconnect()
    }
    expect(snapshotFetch.mock.calls.every(([
      url,
    ]) => url === '/api/results/current')).toBe(true)
    expect(state.activeQuestion.value).toBeNull()
  })

  it('does not fetch a question or protected results for the emoji channel', async () => {
    const state = useQuizSocket('emojis')
    socketState.connect()
    await state.refreshSnapshot()
    expect(snapshotFetch).not.toHaveBeenCalled()
  })

  it('keeps a full question event ahead of an older HTTP response without refetching', async () => {
    const state = useQuizSocket()
    state.updateActiveQuestion(question())
    state.confirmedAnswer.value = 0
    state.selectedAnswer.value = 1
    const stale = deferred<Question>()
    snapshotFetch.mockReturnValueOnce(stale.promise)
    const loading = state.refreshSnapshot()
    const signal = snapshotFetch.mock.calls[0]![1].signal as AbortSignal
    socketState.data!.value = JSON.stringify({ event: 'new-question', data: question('new') })
    stale.resolve(question())
    await loading
    expect(signal.aborted).toBe(true)
    expect(state.activeQuestion.value?.id).toBe('new')
    expect(snapshotFetch).toHaveBeenCalledOnce()
  })

  it.each([
    result(8),
    null,
  ])('keeps live results ahead of an older initial or manual snapshot (%j)', async (liveResults) => {
    const state = useQuizSocket('results')
    const stale = deferred<Results>()
    snapshotFetch.mockReturnValueOnce(stale.promise)
    const loading = state.refreshSnapshot()
    socketState.data!.value = JSON.stringify({ event: 'results-update', data: liveResults })
    stale.resolve(result())
    await loading
    expect(state.results.value).toEqual(liveResults)
  })

  it('supersedes an initial request with connection recovery and then a newer manual refresh', async () => {
    const state = useQuizSocket()
    const initial = deferred<Question>()
    const recovery = deferred<Question>()
    snapshotFetch.mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(recovery.promise).mockResolvedValueOnce(question('latest'))
    const loading = state.refreshSnapshot()
    socketState.connect()
    await state.refreshSnapshot()
    recovery.resolve(question('recovery'))
    initial.resolve(question('initial'))
    await loading
    await flushPromises()
    expect(state.activeQuestion.value?.id).toBe('latest')
    expect(logger_error).not.toHaveBeenCalled()
  })

  it('preserves a same-question draft and its confirmed answer across recovery', async () => {
    const state = useQuizSocket()
    state.updateActiveQuestion(question())
    state.confirmedAnswer.value = 0
    state.selectedAnswer.value = 1
    snapshotFetch.mockResolvedValueOnce(question('first', true))
    socketState.connect()
    await flushPromises()
    expect(state.activeQuestion.value?.is_locked).toBe(true)
    expect(state.selectedAnswer.value).toBe(1)
    expect(state.confirmedAnswer.value).toBe(0)
  })

  it.each([
    undefined,
    408,
    429,
    500,
    503,
    599,
  ])('retries a transient failure (%s) after one and two seconds', async (status) => {
    vi.useFakeTimers()
    const state = useQuizSocket()
    snapshotFetch.mockRejectedValueOnce({ status }).mockRejectedValueOnce({ status }).mockResolvedValueOnce(question())
    const loading = state.refreshSnapshot()
    await vi.advanceTimersByTimeAsync(999)
    expect(snapshotFetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(snapshotFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1999)
    expect(snapshotFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await loading
    expect(snapshotFetch).toHaveBeenCalledTimes(3)
    expect(snapshotFetch.mock.calls.every(([
      , options,
    ]) => options.retry === false)).toBe(true)
    expect(state.activeQuestion.value?.id).toBe('first')
  })

  it.each([
    400,
    401,
    403,
    404,
    409,
    422,
  ])('does not retry HTTP %s and preserves existing results', async (status) => {
    vi.useFakeTimers()
    const state = useQuizSocket('results')
    state.results.value = result()
    snapshotFetch.mockRejectedValue({ response: { status } })
    await expect(state.refreshSnapshot()).rejects.toEqual({ response: { status } })
    expect(snapshotFetch).toHaveBeenCalledOnce()
    expect(state.results.value).toEqual(result())
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops after three failures and reports background failure once without payloads', async () => {
    vi.useFakeTimers()
    const state = useQuizSocket()
    state.updateActiveQuestion(question())
    snapshotFetch.mockRejectedValue(new TypeError('offline'))
    socketState.connect()
    await vi.runAllTimersAsync()
    expect(snapshotFetch).toHaveBeenCalledTimes(3)
    expect(state.activeQuestion.value?.id).toBe('first')
    expect(logger_error).toHaveBeenCalledExactlyOnceWith('Failed to refresh live state')
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    'disconnect',
    'dispose',
    'event',
    'refresh',
  ])('cancels retry waits on %s without leaving timers', async (action) => {
    vi.useFakeTimers()
    const state = useQuizSocket()
    snapshotFetch.mockRejectedValueOnce(new TypeError('offline'))
    const loading = state.refreshSnapshot()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(1)
    if (action === 'disconnect') socketState.disconnect()
    if (action === 'dispose') scopes[0]!.stop()
    if (action === 'event') socketState.data!.value = JSON.stringify({ event: 'new-question', data: question('live') })
    if (action === 'refresh') await state.refreshSnapshot()
    await loading
    expect(vi.getTimerCount()).toBe(0)
    await vi.runAllTimersAsync()
    expect(snapshotFetch).toHaveBeenCalledTimes(action === 'refresh' ? 2 : 1)
    expect(logger_error).not.toHaveBeenCalled()
  })

  it.each([
    'disconnect',
    'dispose',
  ])('aborts an in-flight snapshot on %s and ignores its late response', async (action) => {
    const state = useQuizSocket()
    const stale = deferred<Question>()
    snapshotFetch.mockReturnValueOnce(stale.promise)
    const loading = state.refreshSnapshot()
    const signal = snapshotFetch.mock.calls[0]![1].signal as AbortSignal
    if (action === 'disconnect') socketState.disconnect()
    else scopes[0]!.stop()
    expect(signal.aborted).toBe(true)
    stale.resolve(question())
    await loading
    expect(state.activeQuestion.value).toBeNull()
    expect(logger_error).not.toHaveBeenCalled()
    if (action === 'dispose') {
      await state.refreshSnapshot()
      expect(snapshotFetch).toHaveBeenCalledOnce()
    }
  })
})

describe('partial question recovery', () => {
  it.each([
    'lock-status',
    'answers-reset',
  ])('recovers an offline edit after %s while preserving its immediate effects', async (event) => {
    const state = useQuizSocket()
    state.updateActiveQuestion({ ...question(), question_text: { en: 'Old text' } })
    state.confirmedAnswer.value = 0
    state.selectedAnswer.value = 1
    storedAnswers.set('answer-first', '0')
    const stale = deferred<Question>()
    const replacement = deferred<Question>()
    snapshotFetch.mockReturnValueOnce(stale.promise).mockReturnValueOnce(replacement.promise)
    const loading = state.refreshSnapshot()
    const signal = snapshotFetch.mock.calls[0]![1].signal as AbortSignal
    socketState.data!.value = JSON.stringify({ event, data: { questionId: 'first', is_locked: true } })
    expect(signal.aborted).toBe(true)
    expect(snapshotFetch).toHaveBeenCalledTimes(2)
    if (event === 'lock-status') {
      expect(state.activeQuestion.value?.is_locked).toBe(true)
      expect(state.selectedAnswer.value).toBe(1)
      expect(state.confirmedAnswer.value).toBe(0)
    }
    else {
      expect(state.selectedAnswer.value).toBeNull()
      expect(state.confirmedAnswer.value).toBeNull()
      expect(storedAnswers.has('answer-first')).toBe(false)
    }
    const edited = {
      ...question(), question_text: { en: 'Edited while offline' },
      answer_options: [
        { text: { en: 'Edited option' } },
        { text: { en: 'Other option' } },
      ],
    }
    stale.resolve(edited)
    await loading
    expect(state.activeQuestion.value?.question_text.en).toBe('Old text')
    replacement.resolve({ ...edited, is_locked: event === 'lock-status' })
    await flushPromises()
    expect(state.activeQuestion.value?.question_text.en).toBe('Edited while offline')
    expect(state.activeQuestion.value?.answer_options).toEqual(edited.answer_options)
    expect(state.activeQuestion.value?.is_locked).toBe(event === 'lock-status')
    expect(state.selectedAnswer.value).toBe(event === 'lock-status' ? 1 : null)
    expect(state.confirmedAnswer.value).toBe(event === 'lock-status' ? 0 : null)
    expect(storedAnswers.has('answer-first')).toBe(event === 'lock-status')
    expect(logger_error).not.toHaveBeenCalled()
  })

  it.each([
    'lock-status',
    'answers-reset',
  ])('applies %s without fetching when no snapshot is pending', (event) => {
    const state = useQuizSocket()
    state.updateActiveQuestion(question())
    state.selectedAnswer.value = 1
    socketState.data!.value = JSON.stringify({ event, data: { questionId: 'first', is_locked: true } })
    expect(snapshotFetch).not.toHaveBeenCalled()
    if (event === 'lock-status') expect(state.activeQuestion.value?.is_locked).toBe(true)
    else expect(state.selectedAnswer.value).toBeNull()
  })

  it.each([
    'lock-status',
    'answers-reset',
  ])('does not cancel or restart a results snapshot for %s', async (event) => {
    const state = useQuizSocket('results')
    state.updateActiveQuestion(question())
    const snapshot = deferred<Results>()
    snapshotFetch.mockReturnValueOnce(snapshot.promise)
    const loading = state.refreshSnapshot()
    const signal = snapshotFetch.mock.calls[0]![1].signal as AbortSignal
    socketState.data!.value = JSON.stringify({ event, data: { questionId: 'first', is_locked: true } })
    expect(signal.aborted).toBe(false)
    expect(snapshotFetch).toHaveBeenCalledOnce()
    snapshot.resolve(result(7))
    await loading
    expect(state.results.value?.totalVotes).toBe(7)
  })

  it.each([
    'disconnect',
    'dispose',
    'refresh',
    'new-question',
  ])('cancels a replacement snapshot on %s', async (action) => {
    const state = useQuizSocket()
    state.updateActiveQuestion(question())
    const stale = deferred<Question>()
    const replacement = deferred<Question>()
    snapshotFetch.mockReturnValueOnce(stale.promise).mockReturnValueOnce(replacement.promise)
    const loading = state.refreshSnapshot()
    socketState.data!.value = JSON.stringify({ event: 'lock-status', data: { questionId: 'first', is_locked: true } })
    expect(snapshotFetch).toHaveBeenCalledTimes(2)
    const signal = snapshotFetch.mock.calls[1]![1].signal as AbortSignal
    if (action === 'disconnect') socketState.disconnect()
    if (action === 'dispose') scopes[0]!.stop()
    if (action === 'refresh') {
      snapshotFetch.mockResolvedValueOnce(question('latest'))
      await state.refreshSnapshot()
    }
    if (action === 'new-question') {
      socketState.data!.value = JSON.stringify({ event: 'new-question', data: question('latest') })
    }
    expect(signal.aborted).toBe(true)
    replacement.resolve(question('stale-replacement'))
    stale.resolve(question('stale-initial'))
    await loading
    await flushPromises()
    expect(state.activeQuestion.value?.id).toBe(action === 'refresh' || action === 'new-question' ? 'latest' : 'first')
    expect(snapshotFetch).toHaveBeenCalledTimes(action === 'refresh' ? 3 : 2)
    expect(logger_error).not.toHaveBeenCalled()
  })

  it('keeps replacement retries bounded and cancels their wait on disconnect', async () => {
    vi.useFakeTimers()
    const state = useQuizSocket()
    state.updateActiveQuestion(question())
    const stale = deferred<Question>()
    snapshotFetch.mockReturnValueOnce(stale.promise).mockRejectedValue(new TypeError('offline'))
    const loading = state.refreshSnapshot()
    socketState.data!.value = JSON.stringify({ event: 'lock-status', data: { questionId: 'first', is_locked: true } })
    await vi.advanceTimersByTimeAsync(1000)
    expect(snapshotFetch).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(1)
    socketState.disconnect()
    stale.resolve(question())
    await loading
    await vi.runAllTimersAsync()
    expect(snapshotFetch).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
    expect(state.activeQuestion.value?.is_locked).toBe(true)
    expect(logger_error).not.toHaveBeenCalled()
  })
})
