import { describe, expect, it } from 'vite-plus/test'

import { validateEmojiBatchingConfig } from './emoji-batching-config'

const validConfig = {
  emojiBatchMaxSize: 1200,
  emojiBatchTickMs: 150,
  emojiQueueMaxSize: 25000,
}

describe('validateEmojiBatchingConfig', () => {
  it('accepts positive safe-integer settings', () => {
    expect(() => validateEmojiBatchingConfig(validConfig)).not.toThrow()
  })

  it.each([
    'emojiBatchTickMs',
    'emojiBatchMaxSize',
    'emojiQueueMaxSize',
  ])('rejects zero, negative, fractional, and nonnumeric %s values', (key) => {
    for (const value of [
      0,
      -1,
      0.5,
      'invalid',
    ]) {
      const config: Record<string, unknown> = { ...validConfig }
      config[key] = value

      expect(() => validateEmojiBatchingConfig(config as typeof validConfig)).toThrowError(
        `Invalid runtime config ${key}: expected a positive safe integer.`,
      )
    }
  })
})
