// @vitest-environment jsdom
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
import LeaderboardPage from './leaderboard.vue'

vi.mock('canvas-confetti', () => {
  const instance = Object.assign(vi.fn(), { reset: vi.fn() })
  const confetti = Object.assign(vi.fn(), {
    create: vi.fn(() => instance),
  })

  return { default: confetti }
})

vi.mock('~/utils/pickRandomItem', () => ({
  pickRandomItem: <T>(items: T[]) => items[0],
}))

const route = {
  query: {} as Record<string, string>,
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

const initialResponse = {
  leaderboard: [
    {
      correctAnswers: 3,
      nickname: 'Alice',
      rank: 1,
      userId: 'alice-id',
    },
  ],
  totalPublishedQuestions: 3,
  totalQuestionsWithCorrectAnswers: 3,
}

const refreshedResponse = {
  leaderboard: [
    {
      correctAnswers: 4,
      nickname: 'Bob',
      rank: 1,
      userId: 'bob-id',
    },
  ],
  totalPublishedQuestions: 10,
  totalQuestionsWithCorrectAnswers: 10,
}

function findButton(container: ParentNode, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button'))
    .find(candidate => candidate.textContent === label)

  if (!button) {
    throw new Error(`Button "${label}" is missing`)
  }

  return button
}

async function flushAsyncState() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

function renderPage() {
  const container = document.createElement('div')
  const app = createApp(LeaderboardPage)
  app.component('UiButton', UiButton)
  app.component('UiPageTitle', Passthrough)
  app.component('UiSection', Passthrough)
  document.body.append(container)
  app.mount(container)

  return { app, container }
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('nextTick', nextTick)
  vi.stubGlobal('onBeforeUnmount', onBeforeUnmount)
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('watch', watch)

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})

afterEach(() => {
  document.body.replaceChildren()
  route.query = {}
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('leaderboard display mode', () => {
  it('keeps controls available and hides IDs only when requested', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(initialResponse))
    route.query = {
      background: '#123456',
      core: '',
      refresh: '0',
      showUserId: 'false',
    }

    const rendered = renderPage()
    await flushAsyncState()

    expect(rendered.container.textContent).toContain('drawWinner')
    expect(rendered.container.textContent).toContain('over9000')
    expect(rendered.container.textContent).toContain('refresh')
    expect(rendered.container.textContent).not.toContain('alice-id')
    expect((rendered.container.firstElementChild as HTMLElement).style.backgroundColor).toBe('rgb(18, 52, 86)')

    rendered.app.unmount()
  })

  it('refreshes leaderboard data every five seconds without reloading the page', async () => {
    vi.useFakeTimers()
    const fetchLeaderboard = vi.fn().mockResolvedValue(initialResponse)
    vi.stubGlobal('$fetch', fetchLeaderboard)

    const rendered = renderPage()
    await flushAsyncState()
    expect(fetchLeaderboard).toHaveBeenCalledTimes(1)
    expect(rendered.container.textContent).toContain('alice-id')

    await vi.advanceTimersByTimeAsync(5000)
    await flushAsyncState()

    expect(fetchLeaderboard).toHaveBeenCalledTimes(2)
    expect(rendered.container.textContent).toContain('alice-id')

    rendered.app.unmount()
  })

  it('does not start a second polling request while one is still loading', async () => {
    vi.useFakeTimers()
    let resolveFetch: (response: typeof initialResponse) => void
    const pendingResponse = new Promise<typeof initialResponse>((resolve) => {
      resolveFetch = resolve
    })
    const fetchLeaderboard = vi.fn().mockReturnValue(pendingResponse)
    vi.stubGlobal('$fetch', fetchLeaderboard)

    const rendered = renderPage()
    await flushAsyncState()
    await vi.advanceTimersByTimeAsync(10000)

    expect(fetchLeaderboard).toHaveBeenCalledTimes(1)

    resolveFetch!(initialResponse)
    await flushAsyncState()
    rendered.app.unmount()
  })

  it('keeps a selected winner unchanged after the table refreshes', async () => {
    vi.useFakeTimers()
    const fetchLeaderboard = vi.fn()
      .mockResolvedValueOnce(initialResponse)
      .mockResolvedValueOnce(refreshedResponse)
    vi.stubGlobal('$fetch', fetchLeaderboard)
    route.query = { refresh: '0' }

    const rendered = renderPage()
    await flushAsyncState()

    findButton(rendered.container, 'drawWinner').click()
    await nextTick()
    const dialog = rendered.container.querySelector('dialog') as HTMLDialogElement
    findButton(dialog, 'drawWinner').click()
    await nextTick()

    findButton(rendered.container, 'refresh').click()
    await flushAsyncState()
    await vi.advanceTimersByTimeAsync(750)
    await flushAsyncState()

    expect(dialog.open).toBe(true)
    expect(dialog.textContent).toContain('Alice')
    expect(dialog.textContent).toContain('/ 3')
    expect(rendered.container.textContent).toContain('Bob')

    rendered.app.unmount()
  })
})
