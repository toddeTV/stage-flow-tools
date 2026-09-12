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
      textScale: 1.1,
    })
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
      leaderboardShowUserId: true,
      textScale: 1,
    })
  })
})

describe('buildPresenterIframeUrls', () => {
  it('maps prefixes and never forwards unknown values or a token', () => {
    const parameters = parsePresenterParameters({
      emojiBackground: '#abcdef',
      leaderboardBackground: '#fedcba',
      leaderboardCore: 'true',
      token: 'secret',
    })
    const urls = buildPresenterIframeUrls(parameters)

    expect(urls.emojiUrl).toBe('/admin/emojis?scale=0.3&transparency=0.8&background=%23abcdef')
    expect(urls.leaderboardUrl).toBe(
      '/admin/leaderboard?colorMode=light&padding=0&refresh=5&scale=1&showUserId=true&core=&background=%23fedcba',
    )
    expect(JSON.stringify(urls)).not.toContain('secret')
  })
})
