import type { CSSProperties } from 'vue'

export const DEFAULT_REFRESH_INTERVAL_SECONDS = 5

type DisplayQuery = Record<string, unknown>

export type DisplayParameters = {
  backgroundColor?: string
  isCoreView: boolean
  padding: number
  refreshIntervalMs: number
  scale: number
  showUserId: boolean
  transparency: number
}

function getSingleQueryValue(query: DisplayQuery, key: string): string | undefined {
  const value = query[key]
  return typeof value === 'string' ? value : undefined
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = parseNumber(value, fallback)
  return parsed > 0 ? parsed : fallback
}

function parseNonNegativeNumber(value: string | undefined, fallback: number): number {
  const parsed = parseNumber(value, fallback)
  return parsed >= 0 ? parsed : fallback
}

function parseRefreshInterval(value: string | undefined): number {
  const seconds = parseNumber(value, DEFAULT_REFRESH_INTERVAL_SECONDS)

  if (!Number.isInteger(seconds) || seconds < 0) {
    return DEFAULT_REFRESH_INTERVAL_SECONDS * 1000
  }

  return seconds * 1000
}

function parseBackgroundColor(value: string | undefined): string | undefined {
  return value && /^#[\dA-Fa-f]{6}$/.test(value)
    ? value
    : undefined
}

/** Parses shared, presentation-oriented query parameters. */
export function parseDisplayParameters(query: DisplayQuery): DisplayParameters {
  const transparency = parseNumber(getSingleQueryValue(query, 'transparency'), 1)

  return {
    backgroundColor: parseBackgroundColor(getSingleQueryValue(query, 'background')),
    isCoreView: query.core !== undefined,
    padding: parseNonNegativeNumber(getSingleQueryValue(query, 'padding'), 0),
    refreshIntervalMs: parseRefreshInterval(getSingleQueryValue(query, 'refresh')),
    scale: parsePositiveNumber(getSingleQueryValue(query, 'scale'), 1),
    showUserId: getSingleQueryValue(query, 'showUserId') !== 'false',
    transparency: Math.min(Math.max(transparency, 0), 1),
  }
}

/** Exposes reactive display query parameters for authenticated presentation pages. */
export function useDisplayParameters() {
  const route = useRoute()
  const parameters = computed(() => parseDisplayParameters(route.query))

  const coreViewStyles = computed<CSSProperties>(() => {
    if (!parameters.value.isCoreView) {
      return {}
    }

    return {
      padding: `${parameters.value.padding}px`,
      transform: `scale(${parameters.value.scale})`,
      transformOrigin: 'top left',
      width: `calc(100% / ${parameters.value.scale})`,
    }
  })

  const backgroundStyles = computed<CSSProperties>(() => parameters.value.backgroundColor
    ? { backgroundColor: parameters.value.backgroundColor }
    : {})

  return {
    backgroundStyles,
    coreViewStyles,
    isCoreView: computed(() => parameters.value.isCoreView),
    refreshIntervalMs: computed(() => parameters.value.refreshIntervalMs),
    scale: computed(() => parameters.value.scale),
    showUserId: computed(() => parameters.value.showUserId),
    transparency: computed(() => parameters.value.transparency),
  }
}
