import { describe, expect, it, vi } from 'vite-plus/test'
import { resolveBuildCommitSha } from '../build-commit-sha'

const commitSha = '0123456789abcdef0123456789abcdef01234567'

describe('build commit SHA', () => {
  it('normalizes the configured SHA without invoking Git', () => {
    const readHead = vi.fn()
    expect(resolveBuildCommitSha(` ${commitSha.toUpperCase()}\n`, readHead)).toBe(commitSha)
    expect(readHead).not.toHaveBeenCalled()
  })

  it('uses the checked-out HEAD when no SHA is configured', () => {
    expect(resolveBuildCommitSha(undefined, () => `${commitSha}\n`)).toBe(commitSha)
  })

  it.each([
    '',
    ' ',
    'abcdef0',
    'z'.repeat(40),
  ])('rejects invalid supplied metadata: %j', (value) => {
    expect(() => resolveBuildCommitSha(value)).toThrow('40-character')
  })

  it('fails when Git is unavailable and no SHA was supplied', () => {
    expect(() => resolveBuildCommitSha(undefined, () => { throw new Error('No Git') })).toThrow('Cannot determine')
    expect(() => resolveBuildCommitSha(undefined, () => '')).toThrow('40-character')
  })
})
