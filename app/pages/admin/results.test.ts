// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, onScopeDispose, ref, Suspense, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Results } from '~/types'
import { useQuizSocket } from '~/composables/useQuizSocket'
import UiButton from '~/components/ui/UiButton.vue'
import ResultsPage from './results.vue'

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

const initialResults: Results = {
  question: {
    id: 'first', key: 'first', question_text: { en: 'First question' }, answer_options: [
      { text: { en: 'One' } },
    ],
    is_locked: false, is_disabled: false, sortOrder: 0, createdAt: '2026-10-18T00:00:00Z',
    authoredAt: null, alreadyPublished: true,
  },
  results: { One: { count: 1 } }, totalVotes: 1, totalConnections: 10,
}
const snapshotFetch = vi.fn()
let wrapper: ReturnType<typeof mount> | undefined

async function renderPage() {
  wrapper = mount(defineComponent({ setup: () => () => h(Suspense, null, { default: () => h(ResultsPage) }) }), {
    global: {
      components: {
        UiButton,
        UiSection: { template: '<section><slot /></section>' },
        UiPageTitle: { template: '<h1><slot /></h1>' },
        UiCheckbox: { template: '<label><slot /></label>' },
        AdminBackLink: { template: '<a />' },
        QuizMarkdownText: defineComponent({ props: [
          'text',
        ], setup: props => () => h('span', props.text) }),
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  snapshotFetch.mockReset().mockImplementation(async () => structuredClone(initialResults))
  vi.stubGlobal('$fetch', snapshotFetch)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onScopeDispose', onScopeDispose)
  vi.stubGlobal('useQuizSocket', useQuizSocket)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('getWsEndpoint', () => 'ws://localhost/_ws')
  vi.stubGlobal('useDisplayParameters', () => ({ coreViewStyles: ref({}), isCoreView: ref(false) }))
  vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => {
    const refresh = () => handler()
    await refresh()
    return { refresh }
  })
  vi.stubGlobal('useApiError', () => ({ getErrorMessage: () => 'request failed' }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (text?: { en: string }) => text?.en ?? '' }))
  vi.stubGlobal('useRoute', () => ({ query: {} }))
  vi.stubGlobal('logger', vi.fn())
  vi.stubGlobal('logger_error', vi.fn())
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.unstubAllGlobals()
})

describe('results snapshot recovery', () => {
  it('loads initial results, recovers missed votes and unpublication, and refreshes manually', async () => {
    const page = await renderPage()
    expect(page.text()).toContain('totalVotes: 1')
    socket.connect()
    await flushPromises()
    socket.disconnect()
    snapshotFetch.mockResolvedValueOnce({ ...initialResults, totalVotes: 7 })
    socket.connect()
    await flushPromises()
    expect(page.text()).toContain('totalVotes: 7')
    snapshotFetch.mockResolvedValueOnce({ ...initialResults, totalVotes: 8 })
    await page.findAll('button').find(button => button.text().includes('refreshButton'))!.trigger('click')
    await flushPromises()
    expect(page.text()).toContain('totalVotes: 8')
    socket.disconnect()
    snapshotFetch.mockResolvedValueOnce({ message: 'No active question' })
    socket.connect()
    await flushPromises()
    expect(page.text()).toContain('noActiveQuestion')
    expect(page.text()).not.toContain('totalVotes:')
    expect(snapshotFetch.mock.calls.every(([
      url,
    ]) => url === '/api/results/current')).toBe(true)
  })

  it('does not reapply a stale manual result after live unpublication', async () => {
    const page = await renderPage()
    let resolve!: (value: Results) => void
    snapshotFetch.mockReturnValueOnce(new Promise<Results>((done) => { resolve = done }))
    await page.findAll('button').find(button => button.text().includes('refreshButton'))!.trigger('click')
    socket.data!.value = JSON.stringify({ event: 'results-update', data: null })
    resolve(initialResults)
    await flushPromises()
    expect(page.text()).toContain('noActiveQuestion')
    expect(page.text()).not.toContain('First question')
  })
})
