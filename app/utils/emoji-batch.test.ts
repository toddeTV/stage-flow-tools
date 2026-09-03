import { describe, expect, it } from 'vite-plus/test'

import { getEmojiBatch } from './emoji-batch'

describe('getEmojiBatch', () => {
  it('returns every valid reaction from an emoji batch event', () => {
    expect(getEmojiBatch({
      event: 'emojis',
      data: [
        { emoji: '🔥', id: 'first' },
        { emoji: '👏', id: 'second' },
      ],
    })).toEqual([
      { emoji: '🔥', id: 'first' },
      { emoji: '👏', id: 'second' },
    ])
  })

  it('ignores malformed entries and unrelated events', () => {
    expect(getEmojiBatch({
      event: 'emojis',
      data: [
        { emoji: '🔥', id: 'first' },
        { emoji: '', id: 'missing-emoji' },
        { emoji: '👏' },
      ],
    })).toEqual([
      { emoji: '🔥', id: 'first' },
    ])
    expect(getEmojiBatch({ event: 'emoji', data: { emoji: '🔥', id: 'first' } })).toEqual([])
  })
})
