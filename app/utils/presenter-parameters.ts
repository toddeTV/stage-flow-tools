export const PRESENTER_PARAMETER_DEFAULTS = {
  colorMode: 'light',
  emojiLayer: 'background',
  emojiOpacity: 0.8,
  emojiScale: 0.3,
  foregroundInsetX: 56,
  foregroundInsetY: 40,
  foregroundOpacity: 1,
  leaderboardCore: false,
  leaderboardPadding: 0,
  leaderboardRefresh: 5,
  leaderboardScale: 1,
  leaderboardShowUserId: false,
  presenterRefresh: 2,
  recapCore: false,
  recapCount: 4,
  recapPadding: 0,
  recapRefresh: 5,
  recapScale: 1,
  stageScale: 1,
  textScale: 1,
} as const

type PresenterQuery = Record<string, unknown>

export type PresenterColorMode = 'dark' | 'light'
export type PresenterEmojiLayer = 'background' | 'foreground'

export interface PresenterParameters {
  colorMode: PresenterColorMode
  emojiBackground?: string
  emojiLayer: PresenterEmojiLayer
  emojiOpacity: number
  emojiScale: number
  foregroundInsetX: number
  foregroundInsetY: number
  foregroundOpacity: number
  language?: string
  leaderboardBackground?: string
  leaderboardColorMode: PresenterColorMode
  leaderboardCore: boolean
  leaderboardPadding: number
  leaderboardRefresh: number
  leaderboardScale: number
  leaderboardShowUserId: boolean
  presenterRefresh: number
  recapBackground?: string
  recapColorMode: PresenterColorMode
  recapCore: boolean
  recapCount: number
  recapPadding: number
  recapRefresh: number
  recapScale: number
  stageScale: number
  textScale: number
}

function singleValue(query: PresenterQuery, key: string): string | undefined {
  const value = query[key]
  return typeof value === 'string' ? value : undefined
}

function finiteNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = finiteNumber(value, fallback)
  return parsed > 0 ? parsed : fallback
}

function nonNegativeNumber(value: string | undefined, fallback: number): number {
  const parsed = finiteNumber(value, fallback)
  return parsed >= 0 ? parsed : fallback
}

function opacity(value: string | undefined, fallback: number): number {
  return Math.min(Math.max(finiteNumber(value, fallback), 0), 1)
}

function color(value: string | undefined): string | undefined {
  return value && /^#[\dA-Fa-f]{6}$/.test(value) ? value : undefined
}

function colorMode(value: string | undefined, fallback: PresenterColorMode): PresenterColorMode {
  return value === 'dark' || value === 'light' ? value : fallback
}

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function refreshSeconds(value: string | undefined): number {
  const parsed = nonNegativeNumber(value, PRESENTER_PARAMETER_DEFAULTS.leaderboardRefresh)
  return Number.isInteger(parsed) ? parsed : PRESENTER_PARAMETER_DEFAULTS.leaderboardRefresh
}

function recapCount(value: string | undefined): number {
  const parsed = finiteNumber(value, PRESENTER_PARAMETER_DEFAULTS.recapCount)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4
    ? parsed
    : PRESENTER_PARAMETER_DEFAULTS.recapCount
}

function presenterRefreshSeconds(value: string | undefined): number {
  const parsed = finiteNumber(value, PRESENTER_PARAMETER_DEFAULTS.presenterRefresh)
  if (parsed < 0) return PRESENTER_PARAMETER_DEFAULTS.presenterRefresh
  return parsed === 0 ? 0 : Math.max(parsed, 0.1)
}

function stageScale(value: string | undefined): number {
  const parsed = finiteNumber(value, PRESENTER_PARAMETER_DEFAULTS.stageScale)
  return parsed > 0 && Number.isFinite(100 / parsed)
    ? parsed
    : PRESENTER_PARAMETER_DEFAULTS.stageScale
}

/** Parses the public presenter iframe query contract without retaining unknown keys. */
export function parsePresenterParameters(query: PresenterQuery): PresenterParameters {
  const parsedColorMode = colorMode(singleValue(query, 'colorMode'), PRESENTER_PARAMETER_DEFAULTS.colorMode)

  return {
    colorMode: parsedColorMode,
    emojiBackground: color(singleValue(query, 'emojiBackground')),
    emojiLayer: singleValue(query, 'emojiLayer') === 'foreground' ? 'foreground' : 'background',
    emojiOpacity: opacity(singleValue(query, 'emojiOpacity'), PRESENTER_PARAMETER_DEFAULTS.emojiOpacity),
    emojiScale: positiveNumber(singleValue(query, 'emojiScale'), PRESENTER_PARAMETER_DEFAULTS.emojiScale),
    foregroundInsetX: nonNegativeNumber(
      singleValue(query, 'foregroundInsetX'), PRESENTER_PARAMETER_DEFAULTS.foregroundInsetX,
    ),
    foregroundInsetY: nonNegativeNumber(
      singleValue(query, 'foregroundInsetY'), PRESENTER_PARAMETER_DEFAULTS.foregroundInsetY,
    ),
    foregroundOpacity: opacity(singleValue(query, 'foregroundOpacity'), PRESENTER_PARAMETER_DEFAULTS.foregroundOpacity),
    language: singleValue(query, 'language')?.trim() || undefined,
    leaderboardBackground: color(singleValue(query, 'leaderboardBackground')),
    leaderboardColorMode: colorMode(singleValue(query, 'leaderboardColorMode'), parsedColorMode),
    leaderboardCore: booleanValue(singleValue(query, 'leaderboardCore'), PRESENTER_PARAMETER_DEFAULTS.leaderboardCore),
    leaderboardPadding: nonNegativeNumber(
      singleValue(query, 'leaderboardPadding'), PRESENTER_PARAMETER_DEFAULTS.leaderboardPadding,
    ),
    leaderboardRefresh: refreshSeconds(singleValue(query, 'leaderboardRefresh')),
    leaderboardScale: positiveNumber(
      singleValue(query, 'leaderboardScale'), PRESENTER_PARAMETER_DEFAULTS.leaderboardScale,
    ),
    leaderboardShowUserId: booleanValue(
      singleValue(query, 'leaderboardShowUserId'), PRESENTER_PARAMETER_DEFAULTS.leaderboardShowUserId,
    ),
    presenterRefresh: presenterRefreshSeconds(singleValue(query, 'presenterRefresh')),
    recapBackground: color(singleValue(query, 'recapBackground')),
    recapColorMode: colorMode(singleValue(query, 'recapColorMode'), parsedColorMode),
    recapCore: booleanValue(singleValue(query, 'recapCore'), PRESENTER_PARAMETER_DEFAULTS.recapCore),
    recapCount: recapCount(singleValue(query, 'recapCount')),
    recapPadding: nonNegativeNumber(singleValue(query, 'recapPadding'), PRESENTER_PARAMETER_DEFAULTS.recapPadding),
    recapRefresh: refreshSeconds(singleValue(query, 'recapRefresh')),
    recapScale: positiveNumber(singleValue(query, 'recapScale'), PRESENTER_PARAMETER_DEFAULTS.recapScale),
    stageScale: stageScale(singleValue(query, 'stageScale')),
    textScale: positiveNumber(singleValue(query, 'textScale'), PRESENTER_PARAMETER_DEFAULTS.textScale),
  }
}

/** Builds same-origin child iframe URLs from the presenter parameter whitelist. */
export function buildPresenterIframeUrls(parameters: PresenterParameters) {
  const emoji = new URLSearchParams({
    scale: String(parameters.emojiScale),
    transparency: String(parameters.emojiOpacity),
  })
  if (parameters.emojiBackground) emoji.set('background', parameters.emojiBackground)

  const leaderboard = new URLSearchParams({
    colorMode: parameters.leaderboardColorMode,
    padding: String(parameters.leaderboardPadding),
    refresh: String(parameters.leaderboardRefresh),
    scale: String(parameters.leaderboardScale),
    showUserId: String(parameters.leaderboardShowUserId),
  })
  if (parameters.leaderboardCore) leaderboard.set('core', '')
  if (parameters.leaderboardBackground) leaderboard.set('background', parameters.leaderboardBackground)

  const recap = new URLSearchParams({
    colorMode: parameters.recapColorMode,
    count: String(parameters.recapCount),
    padding: String(parameters.recapPadding),
    refresh: String(parameters.recapRefresh),
    scale: String(parameters.recapScale),
  })
  if (parameters.recapCore) recap.set('core', '')
  if (parameters.recapBackground) recap.set('background', parameters.recapBackground)
  if (parameters.language) recap.set('language', parameters.language)

  return {
    emojiUrl: `/admin/emojis?${emoji.toString()}`,
    leaderboardUrl: `/admin/leaderboard?${leaderboard.toString()}`,
    recapUrl: `/admin/recap?${recap.toString()}`,
  }
}
