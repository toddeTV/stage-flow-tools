import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { defineApiHandler } from '../server/utils/api-errors'
import { requestRoute } from './helpers/h3'

const getActiveQuestion = vi.fn()

beforeEach(() => {
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('getActiveQuestion', getActiveQuestion)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('GET /api/questions/active', () => {
  it('returns only public question fields', async () => {
    getActiveQuestion.mockResolvedValue({
      alreadyPublished: true,
      answer_options: [
        { emoji: '⭐', text: { en: 'Correct' } },
        { emoji: '❌', text: { en: 'Incorrect' } },
      ],
      createdAt: '2026-09-11T10:00:00.000Z',
      id: 'question-id',
      is_active: true,
      is_disabled: true,
      is_locked: false,
      key: 'admin-only-key',
      note: { en: 'Admin-only note' },
      question_text: { en: 'Question text' },
      sortOrder: 3,
    })
    const { default: route } = await import('../server/api/questions/active.get')

    const response = await requestRoute(route, '/api/questions/active')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      answer_options: [
        { text: { en: 'Correct' } },
        { text: { en: 'Incorrect' } },
      ],
      createdAt: '2026-09-11T10:00:00.000Z',
      id: 'question-id',
      is_active: true,
      is_locked: false,
      question_text: { en: 'Question text' },
    })
  })
})
