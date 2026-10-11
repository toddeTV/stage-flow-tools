import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { parse } from 'valibot'

const verify = vi.fn()
const query = vi.fn(() => ({}))
const state = vi.fn()
vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('verifyAdmin', verify)
vi.stubGlobal('getQuery', query)
vi.stubGlobal('parseValidatedValue', (value: unknown, schema: Parameters<typeof parse>[0]) => parse(schema, value))
vi.stubGlobal('getPresenterCurrentState', state)
const { default: route } = await import('./current-state.get')
afterEach(() => vi.resetAllMocks())

describe('Presenter aggregate API', () => {
  it('authenticates before reading any requested state', async () => {
    verify.mockRejectedValueOnce(new Error('unauthenticated'))
    await expect(route({} as never)).rejects.toThrow('unauthenticated')
    expect(state).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
  })
  it('keeps default active-state requests and forwards an optional trimmed key', async () => {
    query.mockReturnValueOnce({}).mockReturnValueOnce({ key: ' stable ' })
    state.mockResolvedValue({ hasActiveQuestion: false, currentQuestion: { key: 'stable', is_active: false } })
    await route({} as never)
    expect(state).toHaveBeenLastCalledWith(undefined)
    await expect(route({} as never)).resolves.toMatchObject({ currentQuestion: { key: 'stable', is_active: false } })
    expect(state).toHaveBeenLastCalledWith('stable')
  })
  it('rejects malformed or repeated keys before loading state', async () => {
    query.mockReturnValueOnce({ key: [
      'one',
      'two',
    ] })
    await expect(route({} as never)).rejects.toThrow()
    expect(state).not.toHaveBeenCalled()
  })
})
