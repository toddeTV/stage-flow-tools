// @vitest-environment jsdom
import {
  computed,
  createApp,
  nextTick,
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
import EmojisPage from './emojis.vue'

const route = {
  query: {} as Record<string, string>,
}

function renderPage() {
  const container = document.createElement('div')
  const app = createApp(EmojisPage)
  document.body.append(container)
  app.mount(container)

  return { app, container }
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('getWsEndpoint', () => 'ws://localhost/_ws')
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('onMounted', (callback: () => void) => callback())
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useWebSocket', () => ({ data: ref('') }))
  vi.stubGlobal('useWindowSize', () => ({ height: ref(768), width: ref(1024) }))
  vi.stubGlobal('watch', watch)
})

afterEach(() => {
  document.body.replaceChildren()
  route.query = {}
  vi.unstubAllGlobals()
})

describe('emoji display background', () => {
  it('uses a valid background color', async () => {
    route.query = { background: '#123456' }
    const rendered = renderPage()
    await nextTick()

    const display = rendered.container.firstElementChild as HTMLElement
    expect(display.style.backgroundColor).toBe('rgb(18, 52, 86)')

    rendered.app.unmount()
  })

  it('keeps the transparent default without a background parameter', async () => {
    const rendered = renderPage()
    await nextTick()

    const display = rendered.container.firstElementChild as HTMLElement
    expect(display.style.backgroundColor).toBe('')

    rendered.app.unmount()
  })
})
