// @vitest-environment happy-dom
import { computed, effectScope, onScopeDispose, ref, watch } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { Storage } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useQuizSocket } from '../app/composables/useQuizSocket'
import { useQuizAnswers } from '../app/composables/useQuizAnswers'
import type { Question } from '../app/types'

/** Simulates browser frame delivery while retaining the installed VueUse transport. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  send = vi.fn()

  constructor() {
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.onclose?.()
  }

  receive(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }))
  }
}

let scope: ReturnType<typeof effectScope>
const fetch = vi.fn()
const question = { id: 'first', is_locked: false, answer_options: [
  { text: { en: 'One' } },
  { text: { en: 'Two' } },
] } as Question
const reset = JSON.stringify({ event: 'answers-reset', data: { questionId: 'first' } })

beforeEach(() => {
  scope = effectScope()
  FakeWebSocket.instances = []
  vi.stubGlobal('localStorage', new Storage())
  vi.stubGlobal('sessionStorage', new Storage())
  localStorage.setItem('quiz-user-id', 'participant-id')
  fetch.mockReset().mockResolvedValue(question)
  vi.stubGlobal('$fetch', fetch)
  vi.stubGlobal('WebSocket', FakeWebSocket)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onScopeDispose', onScopeDispose)
  vi.stubGlobal('getWsEndpoint', () => 'ws://localhost/_ws')
  vi.stubGlobal('logger', vi.fn())
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('alert', vi.fn())
  vi.stubGlobal('useApiError', () => ({
    getErrorCode: () => undefined,
    getErrorMessage: () => 'request failed',
  }))
})

afterEach(() => {
  scope.stop()
  vi.unstubAllGlobals()
})

async function connect() {
  const state = scope.run(() => useQuizSocket())!
  const transport = FakeWebSocket.instances[0]!
  transport.onopen?.()
  await flushPromises()
  return { state, transport }
}

describe('quiz WebSocket frame delivery', () => {
  it('applies consecutive identical resets and invalidates pending answer operations', async () => {
    sessionStorage.setItem('answer-first', '1')
    const { state, transport } = await connect()
    const answers = scope.run(() => useQuizAnswers({
      ...state, refreshQuestion: state.refreshSnapshot,
    }, ref('Participant')))!
    const resets = vi.fn()
    scope.run(() => watch(state.answerReset, resets, { flush: 'sync' }))

    expect(state.confirmedAnswer.value).toBe(1)
    transport.receive(reset)
    expect(state.selectedAnswer.value).toBeNull()
    expect(state.confirmedAnswer.value).toBeNull()
    expect(sessionStorage.getItem('answer-first')).toBeNull()
    state.selectedAnswer.value = 0
    await answers.submitAnswer()
    expect(state.confirmedAnswer.value).toBe(0)
    expect(sessionStorage.getItem('answer-first')).toBe('0')

    let resolve!: () => void
    fetch.mockReturnValueOnce(new Promise<void>((done) => { resolve = done }))
    state.selectedAnswer.value = 1
    const pending = answers.submitAnswer()
    state.selectedAnswer.value = 0
    void answers.submitAnswer()
    transport.receive(reset)

    try {
      expect(resets).toHaveBeenCalledTimes(2)
      expect(state.selectedAnswer.value).toBeNull()
      expect(state.confirmedAnswer.value).toBeNull()
      expect(sessionStorage.getItem('answer-first')).toBeNull()
      expect(answers.answerPending.value).toBe(false)
    }
    finally {
      resolve()
      await pending
    }
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(state.confirmedAnswer.value).toBeNull()
    expect(sessionStorage.getItem('answer-first')).toBeNull()
  })

  it('delivers identical winner events and ignores heartbeat frames', async () => {
    const { transport } = await connect()
    const winner = JSON.stringify({ event: 'winner-selected', data: {
      userId: 'participant-id', username: 'Participant', option: 'One',
    } })
    transport.receive(winner)
    transport.receive(winner)
    expect(alert).toHaveBeenCalledTimes(2)
    transport.receive('pong')
    expect(logger).not.toHaveBeenCalled()
    expect(logger_error).not.toHaveBeenCalled()
  })

  it('ignores frames after disposal and keeps malformed-frame handling', async () => {
    const { state, transport } = await connect()
    transport.receive('invalid json')
    expect(logger_error).toHaveBeenCalledOnce()
    scope.stop()
    const version = state.questionVersion.value
    transport.receive(reset)
    expect(state.answerReset.value).toBeNull()
    expect(state.questionVersion.value).toBe(version)
  })
})
