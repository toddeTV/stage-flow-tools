import {
  describe,
  expect,
  it,
} from 'vite-plus/test'
import {
  DEFAULT_REFRESH_INTERVAL_SECONDS,
  parseDisplayParameters,
} from './useDisplayParameters'

describe('parseDisplayParameters', () => {
  it('parses the shared display contract', () => {
    expect(parseDisplayParameters({
      background: '#12aBcD',
      core: '',
      padding: '20',
      refresh: '10',
      scale: '0.9',
      showUserId: 'false',
      transparency: '0.4',
    })).toEqual({
      backgroundColor: '#12aBcD',
      isCoreView: true,
      padding: 20,
      refreshIntervalMs: 10000,
      scale: 0.9,
      showUserId: false,
      transparency: 0.4,
    })
  })

  it('uses safe defaults for missing or invalid values', () => {
    expect(parseDisplayParameters({
      background: '#12345',
      padding: '-1',
      refresh: '-1',
      scale: '0',
      showUserId: 'no',
      transparency: '2',
    })).toEqual({
      backgroundColor: undefined,
      isCoreView: false,
      padding: 0,
      refreshIntervalMs: DEFAULT_REFRESH_INTERVAL_SECONDS * 1000,
      scale: 1,
      showUserId: true,
      transparency: 1,
    })
  })

  it('allows refresh to be disabled without changing the other defaults', () => {
    expect(parseDisplayParameters({ refresh: '0' })).toMatchObject({
      refreshIntervalMs: 0,
      showUserId: true,
    })
  })
})
