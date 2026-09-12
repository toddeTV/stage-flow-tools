// @vitest-environment happy-dom
import {
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import RecapPage from './recap.vue'
import AdminBackLink from '~/components/admin/AdminBackLink.vue'

const route = {
  query: {} as Record<string, unknown>,
}

const UiButton = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

const Passthrough = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const Icon = defineComponent({
  props: { name: { required: true, type: String } },
  setup(props) {
    return () => h('svg', { 'data-icon': props.name })
  },
})

const recap = {
  totals: {
    answeredQuestions: 3,
    answers: 20,
    correctAnswers: 15,
    participants: 8,
    publishedQuestions: 3,
    scoredAnswers: 20,
  },
  highlights: [
    {
      answerCount: 8,
      correctAnswerCount: 8,
      kind: 'best-known' as const,
      question: { id: 'best', text: { de: 'Beste deutsche Frage', en: 'Best English question' } },
    },
    {
      answerCount: 8,
      correctAnswerCount: 2,
      kind: 'hardest' as const,
      question: { id: 'hard', text: { en: 'Hard question' } },
    },
    {
      answerCount: 12,
      kind: 'most-answered' as const,
      question: { id: 'popular', text: { en: 'Popular question' } },
    },
    {
      answerCount: 10,
      kind: 'closest-call' as const,
      leadingOptions: [
        { count: 5, text: { de: 'Rot', en: 'Red' } },
        { count: 4, text: { en: 'Blue' } },
      ] as [
        { count: number, text: { de: string, en: string } },
        { count: number, text: { en: string } },
      ],
      question: { id: 'close', text: { en: 'Close question' } },
    },
  ],
}

async function flushAsyncState() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

function renderPage() {
  const container = document.createElement('div')
  const app = createApp(RecapPage)
  app.component('AdminBackLink', AdminBackLink)
  app.component('Icon', Icon)
  app.component('NuxtLink', Passthrough)
  app.component('UiButton', UiButton)
  app.component('UiPageTitle', Passthrough)
  document.body.append(container)
  app.mount(container)
  return { app, container }
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('onBeforeUnmount', onBeforeUnmount)
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useI18n', () => ({ locale: ref('de'), t: (key: string) => key }))
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('watch', watch)
})

afterEach(() => {
  document.body.replaceChildren()
  route.query = {}
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('quiz recap display mode', () => {
  it('uses core mode, dark mode, count, and requested language', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(recap))
    route.query = {
      colorMode: 'dark',
      core: '',
      count: '1',
      language: 'de-DE',
      refresh: '0',
    }

    const rendered = renderPage()
    await flushAsyncState()

    expect(rendered.container.firstElementChild?.getAttribute('data-color-mode')).toBe('dark')
    expect(rendered.container.querySelector('[to="/admin"]')).toBeNull()
    expect(rendered.container.querySelectorAll('.recap-card')).toHaveLength(1)
    expect(rendered.container.textContent).toContain('Beste deutsche Frage')
    expect(rendered.container.textContent).toContain('75%')
    expect(rendered.container.querySelector('.recap-hero')).not.toBeNull()
    rendered.app.unmount()
  })

  it('falls back to all highlights for invalid or repeated count values', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(recap))
    route.query = {
      count: [
        '1',
        '2',
      ],
      refresh: '0',
    }

    const rendered = renderPage()
    await flushAsyncState()

    expect(rendered.container.querySelector('[to="/admin"]')).not.toBeNull()
    expect(rendered.container.querySelectorAll('.recap-card')).toHaveLength(4)
    rendered.app.unmount()
  })

  it('does not poll when refresh is disabled and presents an empty recap accessibly', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      ...recap,
      highlights: [],
      totals: { ...recap.totals, answers: 0, correctAnswers: 0, scoredAnswers: 0 },
    }))
    route.query = { refresh: '0' }

    const rendered = renderPage()
    await flushAsyncState()
    await vi.advanceTimersByTimeAsync(10000)

    expect($fetch).toHaveBeenCalledTimes(1)
    expect(rendered.container.textContent).toContain('—')
    expect(rendered.container.querySelector('[role="status"]')).not.toBeNull()
    rendered.app.unmount()
  })

  it('shows an initial loading error and retries from the presentation surface', async () => {
    const fetchRecap = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(recap)
    vi.stubGlobal('$fetch', fetchRecap)
    route.query = { core: '', refresh: '0' }

    const rendered = renderPage()
    await flushAsyncState()

    const retry = Array.from(rendered.container.querySelectorAll('button'))
      .find(button => button.textContent?.includes('retry'))
    expect(rendered.container.querySelector('[role="status"]')).not.toBeNull()
    expect(retry).toBeDefined()

    retry?.click()
    await flushAsyncState()
    expect(rendered.container.textContent).toContain('Beste deutsche Frage')
    rendered.app.unmount()
  })

  it('keeps last successful recap visible after a failed background refresh', async () => {
    vi.useFakeTimers()
    let rejectRefresh: (reason?: unknown) => void
    const pendingRefresh = new Promise<typeof recap>((_resolve, reject) => {
      rejectRefresh = reject
    })
    const fetchRecap = vi.fn()
      .mockResolvedValueOnce(recap)
      .mockReturnValueOnce(pendingRefresh)
    vi.stubGlobal('$fetch', fetchRecap)

    const rendered = renderPage()
    await flushAsyncState()
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()

    expect(rendered.container.textContent).toContain('Beste deutsche Frage')
    rejectRefresh!(new Error('Network error'))
    await flushAsyncState()

    expect(rendered.container.textContent).toContain('Beste deutsche Frage')
    expect(rendered.container.textContent).not.toContain('error')
    rendered.app.unmount()
  })
})
