import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { pickRandomItem } from './pickRandomItem'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('pickRandomItem', () => {
  it('returns undefined for an empty list', () => {
    expect(pickRandomItem([])).toBeUndefined()
  })

  it('can select the first item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(pickRandomItem([
      'first',
      'middle',
      'last',
    ])).toBe('first')
  })

  it('can select the last item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)

    expect(pickRandomItem([
      'first',
      'middle',
      'last',
    ])).toBe('last')
  })
})
