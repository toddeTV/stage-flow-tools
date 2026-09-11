import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-11T10:00:00.000Z'))
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: { emojiCooldownMs: 1500 },
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('emoji cooldown state', () => {
  it('checks users in constant time between cleanup intervals', async () => {
    const iterator = vi.spyOn(Map.prototype, Symbol.iterator)
    const {
      checkEmojiCooldown,
      updateEmojiTimestamp,
    } = await import('./runtime-state')

    expect(checkEmojiCooldown('first')).toBe(false)
    updateEmojiTimestamp('first')
    expect(checkEmojiCooldown('first')).toBe(true)
    expect(checkEmojiCooldown('second')).toBe(false)
    expect(iterator).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1500)
    expect(checkEmojiCooldown('first')).toBe(false)
    expect(iterator).toHaveBeenCalledTimes(2)
  })
})
