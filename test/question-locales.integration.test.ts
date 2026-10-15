import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineApiHandler } from '../server/utils/api-errors'
import { requestRoute } from './helpers/h3'

afterEach(() => vi.unstubAllGlobals())

describe('GET /api/questions/locales', () => {
  it('allows public access and returns only the combined language keys', async () => {
    vi.stubGlobal('defineApiHandler', defineApiHandler)
    vi.stubGlobal('getQuestions', vi.fn().mockResolvedValue([
      {
        key: 'private-key',
        question_text: { en: 'Private question', es: 'Pregunta' },
        answer_options: [
          { emoji: '⭐', text: { en: 'Correct', ja: 'はい' } },
        ],
        note: { fr: 'Private note' },
      },
      { is_disabled: true, question_text: { en: 'Disabled', xx: 'Custom' }, answer_options: [] },
    ]))
    const { default: route } = await import('../server/api/questions/locales.get')
    const response = await requestRoute(route, '/api/questions/locales')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      'en',
      'es',
      'fr',
      'ja',
      'xx',
    ])
  })

  it('returns an empty pool when no questions exist', async () => {
    vi.stubGlobal('defineApiHandler', defineApiHandler)
    vi.stubGlobal('getQuestions', vi.fn().mockResolvedValue([]))
    const { default: route } = await import('../server/api/questions/locales.get')
    const response = await requestRoute(route, '/api/questions/locales')
    expect(await response.json()).toEqual([])
  })
})
