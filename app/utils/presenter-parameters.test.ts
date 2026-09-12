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
      emojiBackground: undefined,
      language: undefined,
      leaderboardBackground: undefined,
      leaderboardColorMode: 'light',
    })
    expect(parsePresenterParameters({ leaderboardShowUserId: 'true' }).leaderboardShowUserId).toBe(true)
  })

  it('parses themes, layers, colors, booleans, and prefixed values', () => {
    expect(parsePresenterParameters({
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
      stageScale: '0.75',
      textScale: '1.1',
    })).toEqual({
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
      stageScale: '0',
      textScale: 'NaN',
    })).toMatchObject({
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
})

describe('buildPresenterIframeUrls', () => {
  it('maps prefixes and never forwards unknown values or a token', () => {
    const parameters = parsePresenterParameters({
      emojiBackground: '#abcdef',
      leaderboardBackground: '#fedcba',
      leaderboardCore: 'true',
      presenterRefresh: '0.5',
      stageScale: '0.75',
      token: 'secret',
    })
    const urls = buildPresenterIframeUrls(parameters)

    expect(urls.emojiUrl).toBe('/admin/emojis?scale=0.3&transparency=0.8&background=%23abcdef')
    expect(urls.leaderboardUrl).toBe(
      '/admin/leaderboard?colorMode=light&padding=0&refresh=5&scale=1&showUserId=false&core=&background=%23fedcba',
    )
    expect(JSON.stringify(urls)).not.toContain('presenterRefresh')
    expect(JSON.stringify(urls)).not.toContain('stageScale')
    expect(JSON.stringify(urls)).not.toContain('secret')
  })
})
