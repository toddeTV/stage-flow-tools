import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

const verify = vi.fn()
const query = vi.fn()
const parse = vi.fn()
const questions = vi.fn()
const results = vi.fn()
vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('verifyAdmin', verify)
vi.stubGlobal('getQuery', query)
vi.stubGlobal('parseValidatedValue', parse)
vi.stubGlobal('getQuestions', questions)
vi.stubGlobal('getResultsForQuestion', results)
vi.stubGlobal('throwApiError', (status: number, code: string) => { throw new Error(`${status}:${code}`) })
const { default: route } = await import('./question-state.get')
afterEach(() => vi.resetAllMocks())

describe('selected aggregate API', () => {
  it('requires authentication before accessing aggregate state', async () => {
    verify.mockRejectedValueOnce(new Error('unauthenticated'))
    await expect(route({} as never)).rejects.toThrow('unauthenticated')
    expect(questions).not.toHaveBeenCalled()
  })
  it('returns inactive selected aggregates and rejects disabled or unknown keys', async () => {
    parse.mockReturnValue({ key: 'stable-key' })
    questions.mockResolvedValue([
      { key: 'stable-key', id: 'generated-id', is_disabled: false },
    ])
    results.mockResolvedValue({ question: { is_active: false }, totalVotes: 7 })
    await expect(route({} as never)).resolves.toEqual({ question: { is_active: false }, totalVotes: 7 })
    expect(results).toHaveBeenCalledWith('generated-id')
    questions.mockResolvedValue([
      { key: 'stable-key', id: 'generated-id', is_disabled: true },
    ])
    await expect(route({} as never)).rejects.toThrow('404:quiz.question_not_found')
    questions.mockResolvedValue([])
    await expect(route({} as never)).rejects.toThrow('404:quiz.question_not_found')
  })
})
