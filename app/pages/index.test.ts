// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, onMounted, onScopeDispose, ref, Suspense, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Question } from '~/types'
import { EmojiSchema, getValidationIssues, NicknameSchema } from '#shared/utils/validation'
import { useQuizSocket } from '~/composables/useQuizSocket'
import UiButton from '~/components/ui/UiButton.vue'
import UiInput from '~/components/ui/UiInput.vue'
import UiRadioOption from '~/components/ui/UiRadioOption.vue'
import ParticipantPage from './index.vue'

const socket = vi.hoisted(() => ({
  data: undefined as undefined | { value: string },
  connect: () => {},
  disconnect: () => {},
}))
vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')
  return {
    useLocalStorage: () => ref('participant-id'),
    useWebSocket: (_url: unknown, options: { onConnected: () => void, onDisconnected: () => void }) => {
      const data = ref('')
      socket.data = data
      socket.connect = options.onConnected
      socket.disconnect = options.onDisconnected
      return { data, status: ref('OPEN'), send: vi.fn(), open: vi.fn(), close: vi.fn() }
    },
  }
})

const question = {
  id: 'first',
  is_locked: false,
  question_text: { en: 'First question' },
  answer_options: [
    { text: { en: 'One' } },
    { text: { en: 'Two' } },
  ],
} as Question
const answerFetch = vi.fn()
const questionFetch = vi.fn()
const localValues = new Map<string, string>()
const sessionValues = new Map<string, string>()
let wrapper: ReturnType<typeof mount> | undefined

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function renderPage() {
  wrapper = mount(defineComponent({ setup: () => () => h(Suspense, null, { default: () => h(ParticipantPage) }) }), {
    global: {
      components: {
        UiButton,
        UiRadioOption,
        UiPageTitle: { template: '<h1><slot /></h1>' },
        UiInput,
        QuizMarkdownText: defineComponent({
          props: [
            'text',
          ],
          setup: props => () => h('span', props.text),
        }),
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  for (const [
    name,
    values,
  ] of [
      [
        'localStorage',
        localValues,
      ],
      [
        'sessionStorage',
        sessionValues,
      ],
    ] as const) {
    values.clear()
    vi.stubGlobal(name, {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
  }
  localStorage.setItem('quiz-nickname', 'Participant')
  localStorage.setItem('quiz-user-id', 'participant-id')
  answerFetch.mockReset()
  questionFetch.mockReset().mockImplementation(async () => structuredClone(question))
  vi.stubGlobal('$fetch', (url: string, options: unknown) => url === '/api/questions/active'
    ? questionFetch(options)
    : answerFetch(url, options))
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('onScopeDispose', onScopeDispose)
  vi.stubGlobal('useQuizSocket', useQuizSocket)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => {
    const refresh = async () => { await handler() }
    await refresh()
    return { refresh }
  })
  vi.stubGlobal('useApiError', () => ({
    getErrorCode: (error: { data?: { code?: string } }) => error?.data?.code,
    getErrorMessage: () => 'request failed',
    getIssueMessage: () => 'validation failed',
  }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (text?: { en: string }) => text?.en ?? '' }))
  vi.stubGlobal('useIntervalFn', () => ({ pause: vi.fn(), resume: vi.fn() }))
  vi.stubGlobal('NicknameSchema', NicknameSchema)
  vi.stubGlobal('EmojiSchema', EmojiSchema)
  vi.stubGlobal('getValidationIssues', getValidationIssues)
  vi.stubGlobal('logger', vi.fn())
  vi.stubGlobal('logger_error', vi.fn())
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.unstubAllGlobals()
})

describe('participant answer feedback', () => {
  it('recovers a missed question and lock after reconnect without a manual refresh', async () => {
    const page = await renderPage()
    socket.connect()
    await flushPromises()
    socket.disconnect()
    questionFetch.mockResolvedValueOnce({
      ...question, id: 'next', question_text: { en: 'Next question' }, is_locked: true,
    })
    socket.connect()
    await flushPromises()
    expect(page.text()).toContain('Next question')
    expect(page.text()).toContain('answersLocked')
    expect(page.get<HTMLInputElement>('input[type="radio"]').element.disabled).toBe(true)
    socket.disconnect()
    questionFetch.mockResolvedValueOnce({ message: 'No active question' })
    socket.connect()
    await flushPromises()
    expect(page.text()).toContain('waitingForQuestion')
    expect(page.find('input[type="radio"]').exists()).toBe(false)
  })

  it.each([
    'next',
    'first',
    null,
  ])('preserves question %s recovery when changing nickname and rejoining', async (questionId) => {
    sessionStorage.setItem('answer-first', '0')
    answerFetch.mockResolvedValue({ success: true })
    const page = await renderPage()
    const recovery = deferred<Question | { message: string }>()
    socket.disconnect()
    questionFetch.mockReturnValueOnce(recovery.promise)
    socket.connect()
    const signal = (questionFetch.mock.calls[1]![0] as { signal: AbortSignal }).signal

    await page.findAll('button').find(button => button.text() === 'changeButton')!.trigger('click')
    await flushPromises()
    expect(signal.aborted).toBe(false)
    expect(localStorage.getItem('quiz-nickname')).toBeNull()
    expect(sessionStorage.getItem('answer-first')).toBeNull()
    expect(answerFetch).toHaveBeenCalledExactlyOnceWith('/api/answers/retract', {
      method: 'POST',
      body: { question_id: 'first', user_id: 'participant-id' },
    })

    await page.get('input[placeholder="nicknamePlaceholder"]').setValue('Rejoined')
    await page.get('form').trigger('submit')
    expect(localStorage.getItem('quiz-nickname')).toBe('Rejoined')
    expect(page.find('.answer-banner').exists()).toBe(false)
    recovery.resolve(questionId
      ? { ...question, id: questionId, question_text: { en: 'Recovered question' } }
      : { message: 'No active question' })
    await flushPromises()

    if (questionId) {
      expect(page.text()).toContain('Recovered question')
      expect(page.findAll<HTMLInputElement>('input[type="radio"]').every(input => !input.element.checked)).toBe(true)
    }
    else {
      expect(page.text()).toContain('waitingForQuestion')
      expect(page.find('input[type="radio"]').exists()).toBe(false)
    }
    expect(page.text()).not.toContain('First question')
    expect(page.find('.answer-banner').exists()).toBe(false)
    expect(sessionStorage.getItem('answer-first')).toBeNull()
    expect(localStorage.getItem('quiz-user-id')).toBe('participant-id')
    expect(questionFetch).toHaveBeenCalledTimes(2)
    expect(logger_error).not.toHaveBeenCalled()
  })

  it('confirms optimistically, replaces success on failure, and retries the selected answer', async () => {
    const first = deferred<unknown>()
    answerFetch.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ success: true })
    const page = await renderPage()
    const option = page.get<HTMLInputElement>('input[type="radio"][value="0"]')

    await option.setValue()
    expect(page.get('.answer-banner').text()).toContain('answerSubmitted')
    expect(option.element.checked).toBe(true)
    expect(option.element.disabled).toBe(false)
    expect(sessionStorage.getItem('answer-first')).toBeNull()
    first.reject(new Error('offline'))
    await flushPromises()

    expect(page.find('.answer-banner').exists()).toBe(false)
    expect(page.get('[role="alert"]').text()).toBe('request failed')
    expect(option.element.checked).toBe(true)
    const retry = page.findAll('button').find(button => button.text() === 'retryAnswer')!
    await retry.trigger('click')
    await flushPromises()
    expect(answerFetch.mock.calls[1]![1].body).toEqual(answerFetch.mock.calls[0]![1].body)
    expect(page.find('[role="alert"]').exists()).toBe(false)
    expect(page.get('.answer-banner').text()).toContain('answerSubmitted')
    expect(sessionStorage.getItem('answer-first')).toBe('0')
  })

  it('shows the prior confirmed answer when a failed change is followed by a lock', async () => {
    answerFetch.mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error('offline'))
    const page = await renderPage()
    await page.get('input[type="radio"][value="0"]').setValue()
    await flushPromises()
    await page.get('input[type="radio"][value="1"]').setValue()
    await flushPromises()
    socket.data!.value = JSON.stringify({ event: 'lock-status', data: { questionId: 'first', is_locked: true } })
    await flushPromises()

    expect(page.get('.answer-banner').text()).toContain('One')
    expect(page.get('.answer-banner').text()).not.toContain('Two')
    expect(page.get('[role="status"]').text()).toBe('answerUnconfirmed')
    const retry = page.findAll('button').find(button => button.text() === 'retryAnswer')!
    expect(retry.attributes('disabled')).toBeDefined()
    expect(page.get<HTMLInputElement>('input[value="1"]').element.checked).toBe(true)
  })

  it('does not present a pending first answer as confirmed when voting is locked', async () => {
    const answer = deferred<unknown>()
    answerFetch.mockReturnValueOnce(answer.promise)
    const page = await renderPage()
    await page.get('input[type="radio"][value="0"]').setValue()
    socket.data!.value = JSON.stringify({ event: 'lock-status', data: { questionId: 'first', is_locked: true } })
    await flushPromises()
    expect(page.find('.answer-banner').exists()).toBe(false)
    expect(page.get('[role="status"]').text()).toBe('answerUnconfirmed')
    answer.resolve({ success: true })
    await flushPromises()
    expect(page.get('.answer-banner').text()).toContain('One')
  })

  it('preserves a pending draft across a same-question HTTP refresh', async () => {
    const answer = deferred<unknown>()
    sessionStorage.setItem('answer-first', '0')
    answerFetch.mockReturnValueOnce(answer.promise)
    const page = await renderPage()
    await page.get('input[type="radio"][value="1"]').setValue()
    const refresh = page.findAll('button').find(button => button.text().includes('refreshButton'))!
    await refresh.trigger('click')
    await flushPromises()
    expect(page.get<HTMLInputElement>('input[value="1"]').element.checked).toBe(true)
    answer.resolve({ success: true })
    await flushPromises()
    expect(sessionStorage.getItem('answer-first')).toBe('1')
  })

  it('ignores an old question refresh that completes after a socket publication', async () => {
    const refresh = deferred<Question>()
    answerFetch.mockRejectedValueOnce({ data: { code: 'quiz.question_changed' } })
    const page = await renderPage()
    questionFetch.mockReturnValueOnce(refresh.promise)
    await page.get('input[type="radio"][value="0"]').setValue()
    await flushPromises()
    expect(questionFetch).toHaveBeenCalledTimes(2)

    socket.data!.value = JSON.stringify({
      event: 'new-question',
      data: { ...question, id: 'second', question_text: { en: 'Second question' } },
    })
    await flushPromises()
    refresh.resolve(question)
    await flushPromises()

    expect(page.text()).toContain('Second question')
    expect(page.text()).not.toContain('First question')
    expect(page.find('[role="alert"]').exists()).toBe(false)
    expect(page.find('.answer-banner').exists()).toBe(false)
  })

  it('does not let a delayed HTTP refresh reopen a socket-locked question', async () => {
    const refresh = deferred<Question>()
    const replacement = deferred<Question>()
    const page = await renderPage()
    questionFetch.mockReturnValueOnce(refresh.promise).mockReturnValueOnce(replacement.promise)
    await page.findAll('button').find(button => button.text().includes('refreshButton'))!.trigger('click')
    socket.data!.value = JSON.stringify({ event: 'lock-status', data: { questionId: 'first', is_locked: true } })
    await flushPromises()
    refresh.resolve(question)
    await flushPromises()
    expect(page.get<HTMLInputElement>('input[type="radio"]').element.disabled).toBe(true)
    replacement.resolve({ ...question, is_locked: true, question_text: { en: 'Edited while offline' } })
    await flushPromises()
    expect(page.get<HTMLInputElement>('input[type="radio"]').element.disabled).toBe(true)
    expect(page.text()).toContain('Edited while offline')
    expect(questionFetch).toHaveBeenCalledTimes(3)
  })
})
