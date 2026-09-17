import { describe, expect, it } from 'vite-plus/test'
import {
  buildPresenterIframeUrls,
  parsePresenterParameters,
  PRESENTER_PARAMETER_DEFAULTS,
} from './presenter-parameters'

describe('parsePresenterParameters', () => {
  it('uses the documented defaults', () => {
    expect(parsePresenterParameters({})).toMatchObject(PRESENTER_PARAMETER_DEFAULTS)
    expect(parsePresenterParameters({})).toMatchObject({
      backgroundColor: undefined,
      emojiBackground: undefined,
      language: undefined,
      leaderboardBackground: undefined,
      leaderboardColorMode: 'light',
      recapBackground: undefined,
      recapColorMode: 'light',
    })
    expect(parsePresenterParameters({ leaderboardShowUserId: 'true' }).leaderboardShowUserId).toBe(true)
  })

  it('parses themes, layers, colors, booleans, and prefixed values', () => {
    expect(parsePresenterParameters({
      background: '#abcdef',
      colorMode: 'dark',
      emojiBackground: '#12aBcD',
      emojiLayer: 'foreground',
      emojiOpacity: '0.4',
      emojiScale: '0.6',
      foregroundInsetX: '12',
      foregroundInsetY: '18',
      foregroundOpacity: '0.75',
      language: ' de-DE ',
      leaderboardBackground: '#010203',
      leaderboardColorMode: 'light',
      leaderboardCore: 'true',
      leaderboardPadding: '8',
      leaderboardRefresh: '10',
      leaderboardScale: '1.25',
      leaderboardShowUserId: 'false',
      presenterRefresh: '0.5',
      recapBackground: '#a1b2c3',
      recapColorMode: 'light',
      recapCore: 'true',
      recapCount: '3',
      recapPadding: '12',
      recapRefresh: '15',
      recapScale: '1.5',
      stageScale: '0.75',
      textScale: '1.1',
    })).toEqual({
      backgroundColor: '#abcdef',
      colorMode: 'dark',
      emojiBackground: '#12aBcD',
      emojiLayer: 'foreground',
      emojiOpacity: 0.4,
      emojiScale: 0.6,
      foregroundInsetX: 12,
      foregroundInsetY: 18,
      foregroundOpacity: 0.75,
      language: 'de-DE',
      leaderboardBackground: '#010203',
      leaderboardColorMode: 'light',
      leaderboardCore: true,
      leaderboardPadding: 8,
      leaderboardRefresh: 10,
      leaderboardScale: 1.25,
      leaderboardShowUserId: false,
      presenterRefresh: 0.5,
      recapBackground: '#a1b2c3',
      recapColorMode: 'light',
      recapCore: true,
      recapCount: 3,
      recapPadding: 12,
      recapRefresh: 15,
      recapScale: 1.5,
      stageScale: 0.75,
      textScale: 1.1,
    })
  })

  it('supports safe presenter polling intervals in fractional seconds', () => {
    expect(parsePresenterParameters({ presenterRefresh: '0' }).presenterRefresh).toBe(0)
    expect(parsePresenterParameters({ presenterRefresh: '0.05' }).presenterRefresh).toBe(0.1)
    expect(parsePresenterParameters({ presenterRefresh: '2.25' }).presenterRefresh).toBe(2.25)
  })

  it('accepts every positive stage scale with a representable inverse', () => {
    expect(parsePresenterParameters({ stageScale: '0.000001' }).stageScale).toBe(0.000001)
    expect(parsePresenterParameters({ stageScale: '10' }).stageScale).toBe(10)
    expect(parsePresenterParameters({ stageScale: '1e100' }).stageScale).toBe(1e100)
  })

  it('clamps opacity and falls back for invalid or repeated values', () => {
    expect(parsePresenterParameters({
      colorMode: 'sepia',
      background: '#12345',
      emojiBackground: '#12345',
      emojiLayer: [
        'foreground',
        'background',
      ],
      emojiOpacity: '-1',
      emojiScale: '0',
      foregroundInsetX: '-4',
      foregroundOpacity: '2',
      leaderboardCore: 'yes',
      leaderboardRefresh: '1.5',
      leaderboardScale: 'Infinity',
      leaderboardShowUserId: [
        'false',
      ],
      presenterRefresh: '-1',
      recapCount: '1.5',
      recapRefresh: '1.5',
      recapScale: '0',
      stageScale: '0',
      textScale: 'NaN',
    })).toMatchObject({
      backgroundColor: undefined,
      colorMode: 'light',
      emojiBackground: undefined,
      emojiLayer: 'background',
      emojiOpacity: 0,
      emojiScale: 0.3,
      foregroundInsetX: 56,
      foregroundOpacity: 1,
      leaderboardCore: false,
      leaderboardRefresh: 5,
      leaderboardScale: 1,
      leaderboardShowUserId: false,
      presenterRefresh: 2,
      recapCount: 4,
      recapRefresh: 5,
      recapScale: 1,
      stageScale: 1,
      textScale: 1,
    })

    expect(parsePresenterParameters({ presenterRefresh: '' }).presenterRefresh).toBe(2)
    expect(parsePresenterParameters({ presenterRefresh: 'Infinity' }).presenterRefresh).toBe(2)
    expect(parsePresenterParameters({ presenterRefresh: [
      '0.5',
      '1',
    ] }).presenterRefresh).toBe(2)
    expect(parsePresenterParameters({ stageScale: '-1' }).stageScale).toBe(1)
    expect(parsePresenterParameters({ stageScale: '' }).stageScale).toBe(1)
    expect(parsePresenterParameters({ stageScale: '5e-324' }).stageScale).toBe(1)
    expect(parsePresenterParameters({ stageScale: 'Infinity' }).stageScale).toBe(1)
    expect(parsePresenterParameters({ stageScale: 'not-a-number' }).stageScale).toBe(1)
    expect(parsePresenterParameters({ stageScale: [
      '0.75',
      '1',
    ] }).stageScale).toBe(1)
  })

  it('accepts only one recap count from one through four', () => {
    expect(parsePresenterParameters({ recapCount: '1' }).recapCount).toBe(1)
    expect(parsePresenterParameters({ recapCount: '4' }).recapCount).toBe(4)
    expect(parsePresenterParameters({ recapCount: '0' }).recapCount).toBe(4)
    expect(parsePresenterParameters({ recapCount: '5' }).recapCount).toBe(4)
    expect(parsePresenterParameters({ recapCount: [
      '2',
      '3',
    ] }).recapCount).toBe(4)
  })
})

describe('buildPresenterIframeUrls', () => {
  it('maps prefixes and never forwards unknown values or a token', () => {
    const parameters = parsePresenterParameters({
      background: '#010203',
      emojiBackground: '#abcdef',
      leaderboardBackground: '#fedcba',
      leaderboardCore: 'true',
      language: 'de-DE',
      presenterRefresh: '0.5',
      recapBackground: '#123456',
      recapCore: 'true',
      recapCount: '2',
      recapPadding: '10',
      stageScale: '0.75',
      token: 'secret',
      unknown: 'leak',
    })
    const urls = buildPresenterIframeUrls(parameters)

    expect(urls.emojiUrl).toBe('/admin/emojis?scale=0.3&transparency=0.8&background=%23abcdef')
    expect(urls.leaderboardUrl).toBe(
      '/admin/leaderboard?colorMode=light&padding=0&refresh=5&scale=1&showUserId=false&core=&background=%23fedcba',
    )
    expect(urls.recapUrl).toBe(
      '/admin/recap?colorMode=light&count=2&padding=10&refresh=5&scale=1&core=&background=%23123456&language=de-DE',
    )
    expect(JSON.stringify(urls)).not.toContain('presenterRefresh')
    expect(JSON.stringify(urls)).not.toContain('stageScale')
    expect(JSON.stringify(urls)).not.toContain('%23010203')
    expect(JSON.stringify(urls)).not.toContain('unknown')
    expect(JSON.stringify(urls)).not.toContain('secret')
  })
})
