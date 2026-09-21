import {
  computed,
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
import type { Results } from '~/types'
import { useAdminResults } from './useAdminResults'

const route = {
  query: {} as Record<string, string>,
}

const initialResults: Results = {
  question: {
    answer_options: [
      { text: { en: 'One' } },
      { text: { en: 'Two' } },
    ],
    alreadyPublished: true,
    createdAt: '2026-09-05T00:00:00.000Z',
    id: 'question-id',
    is_active: true,
    is_disabled: false,
    is_locked: false,
    key: 'current-results',
    question_text: { en: 'Current results' },
    sortOrder: 0,
  },
  results: {
    One: { count: 2 },
    Two: { count: 1 },
  },
  totalConnections: 3,
  totalVotes: 3,
}

function createController(fetchedResults = ref<Results | null>(initialResults)) {
  const results = ref<Results | null>(null)
  const refreshResults = vi.fn().mockResolvedValue(undefined)
  const controller = useAdminResults({
    fetchedResults,
    refreshResults,
    results,
  })

  return {
    controller,
    refreshResults,
    results,
  }
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('useApiError', () => ({ getErrorMessage: () => 'request failed' }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (text: { en: string }) => text.en }))
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('seededShuffle', <T>(items: T[]) => items)
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  route.query = {}
  vi.unstubAllGlobals()
})

describe('useAdminResults', () => {
  it('hydrates results and derives result-bar values', () => {
    const { controller, results } = createController()

    expect(results.value).toEqual(initialResults)
    expect(controller.displayResults.value).toEqual([
      [
        'One',
        { count: 2 },
      ],
      [
        'Two',
        { count: 1 },
      ],
    ])
    expect(controller.getBarWidth(2)).toBe(90)
    expect(controller.getPercentage(1)).toBe(33)
    expect(controller.hideResults.value).toBe(true)
    expect(controller.scrambleResults.value).toBe(false)
  })

  it('resets answers and refreshes through the extracted controller', async () => {
    const fetch = vi.fn().mockResolvedValue(undefined)
    const confirm = vi.fn().mockReturnValue(true)
    vi.stubGlobal('$fetch', fetch)
    vi.stubGlobal('window', { confirm })
    const { controller, refreshResults } = createController()

    await controller.resetAnswers()
    await nextTick()

    expect(confirm).toHaveBeenCalledWith('confirmResetAnswers')
    expect(fetch).toHaveBeenCalledWith('/api/answers/reset', { method: 'POST' })
    expect(refreshResults).toHaveBeenCalledOnce()
    expect(controller.isResettingAnswers.value).toBe(false)
  })
})
