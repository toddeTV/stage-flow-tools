// @vitest-environment happy-dom
import {
  computed,
  createApp,
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
import EmojisPage from './emojis.vue'

const route = {
  query: {} as Record<string, string>,
}
const frames = new Map<number, FrameRequestCallback>()
const mountedApps = new Set<ReturnType<typeof createApp>>()
const socketData = ref('')
let frameId = 0

function renderPage() {
  const container = document.createElement('div')
  const app = createApp(EmojisPage)
  document.body.append(container)
  app.mount(container)
  mountedApps.add(app)

  return { container, unmount: () => { app.unmount(); mountedApps.delete(app) } }
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('getWsEndpoint', () => 'ws://localhost/_ws')
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('onBeforeUnmount', onBeforeUnmount)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useWebSocket', () => ({ data: socketData }))
  vi.stubGlobal('useWindowSize', () => ({ height: ref(768), width: ref(1024) }))
  vi.stubGlobal('watch', watch)
})

afterEach(() => {
  for (const app of mountedApps) app.unmount()
  mountedApps.clear()
  frames.clear()
  socketData.value = ''
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
    expect(display.style.backgroundColor).toBe('#123456')

    rendered.unmount()
  })

  it('keeps the transparent default without a background parameter', async () => {
    const rendered = renderPage()
    await nextTick()

    const display = rendered.container.firstElementChild as HTMLElement
    expect(display.style.backgroundColor).toBe('')

    rendered.unmount()
  })

  it('animates while mounted and cancels the latest frame before every unmount', async () => {
    const first = renderPage()
    expect(frames.size).toBe(1)
    socketData.value = JSON.stringify({ event: 'emojis', data: [
      { emoji: '🎉', id: 'reaction' },
    ] })
    await nextTick()
    const emoji = first.container.querySelector<HTMLElement>('.absolute')!
    const previousTop = Number.parseFloat(emoji.style.top)
    const [
      id,
      callback,
    ] = frames.entries().next().value!
    frames.delete(id)
    callback(16)
    await nextTick()
    expect(Number.parseFloat(emoji.style.top)).toBeGreaterThan(previousTop)
    expect(frames.size).toBe(1)
    const latestId = frames.keys().next().value!
    first.unmount()
    expect(cancelAnimationFrame).toHaveBeenLastCalledWith(latestId)
    expect(frames.size).toBe(0)
    const scheduled = vi.mocked(requestAnimationFrame).mock.calls.length
    await nextTick()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(scheduled)

    const second = renderPage()
    expect(frames.size).toBe(1)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(scheduled + 1)
    second.unmount()
    expect(frames.size).toBe(0)
  })
})
