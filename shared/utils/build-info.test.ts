import { describe, expect, it } from 'vite-plus/test'
import { normalizeCommitSha } from './build-info'

describe('commit metadata normalization', () => {
  it('normalizes a full SHA and treats missing or corrupt metadata as unknown', () => {
    expect(normalizeCommitSha(` ${'AB'.repeat(20)}\n`)).toBe('ab'.repeat(20))
    for (const value of [
      undefined,
      null,
      '',
      'abcdef0',
      'z'.repeat(40),
      123,
    ]) {
      expect(normalizeCommitSha(value)).toBeNull()
    }
  })
})
