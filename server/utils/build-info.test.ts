import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { getBuildCommitSha } from './build-info'

afterEach(() => vi.unstubAllGlobals())

describe('embedded build commit', () => {
  it('returns the embedded SHA and handles missing or corrupt runtime metadata', () => {
    expect(getBuildCommitSha()).toBeNull()
    vi.stubGlobal('__STAGE_FLOW_BUILD_COMMIT_SHA__', 'AB'.repeat(20))
    expect(getBuildCommitSha()).toBe('ab'.repeat(20))
    vi.stubGlobal('__STAGE_FLOW_BUILD_COMMIT_SHA__', 'invalid')
    expect(getBuildCommitSha()).toBeNull()
  })
})
