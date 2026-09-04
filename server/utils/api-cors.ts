import {
  getRequestHeader,
  handleCors,
} from 'h3'
import type {
  H3CorsOptions,
  H3Event,
} from 'h3'

type ApiCorsRuntimeConfig = {
  apiCorsAllowedOrigins: unknown
  apiCorsEnabled: unknown
}

type ApiCorsOptions = H3CorsOptions

const apiCorsMethods = [
  'GET',
  'POST',
  'OPTIONS',
]

const apiCorsAllowedHeaders = [
  'Authorization',
  'Content-Type',
]

const invalidAllowedOriginsMessage = [
  'Invalid runtime config apiCorsAllowedOrigins:',
  'expected comma-separated absolute HTTP(S) origins without wildcards,',
  'paths, query parameters, fragments, or credentials.',
].join(' ')

function requireBoolean(value: unknown, key: string): boolean {
  if (value === true || value === 'true') {
    return true
  }

  if (value === false || value === 'false') {
    return false
  }

  throw new Error(`Invalid runtime config ${key}: expected true or false.`)
}

function invalidAllowedOrigins(): never {
  throw new Error(invalidAllowedOriginsMessage)
}

function parseAllowedOrigins(value: unknown): string[] {
  if (typeof value !== 'string') {
    invalidAllowedOrigins()
  }

  if (!value) {
    return []
  }

  const origins = new Set<string>()

  for (const configuredOrigin of value.split(',')) {
    const origin = configuredOrigin.trim()

    if (!origin || origin.includes('*')) {
      invalidAllowedOrigins()
    }

    try {
      const url = new URL(origin)

      if (
        (url.protocol !== 'http:' && url.protocol !== 'https:')
        || origin !== url.origin
      ) {
        invalidAllowedOrigins()
      }

      origins.add(url.origin)
    }
    catch {
      invalidAllowedOrigins()
    }
  }

  return [
    ...origins,
  ]
}

/** Resolves the optional server-side CORS policy for separately hosted API clients. */
export function getApiCorsOptions(config: ApiCorsRuntimeConfig): ApiCorsOptions | undefined {
  if (!requireBoolean(config.apiCorsEnabled, 'apiCorsEnabled')) {
    return undefined
  }

  const origins = parseAllowedOrigins(config.apiCorsAllowedOrigins)

  if (origins.length === 0) {
    throw new Error(
      'Invalid runtime config apiCorsAllowedOrigins: expected at least one origin when apiCorsEnabled is true.',
    )
  }

  return {
    allowHeaders: apiCorsAllowedHeaders,
    credentials: false,
    methods: apiCorsMethods as ApiCorsOptions['methods'],
    origin: origins,
  }
}

/** Fails startup when the configured CORS policy is ambiguous or unsafe. */
export function validateApiCorsConfig(config: ApiCorsRuntimeConfig): void {
  getApiCorsOptions(config)
}

/** Appends API-only CORS headers and returns whether it completed a preflight request. */
export function handleApiCors(event: H3Event, config: ApiCorsRuntimeConfig): boolean {
  if (!event.path.startsWith('/api/') || !getRequestHeader(event, 'origin')) {
    return false
  }

  const options = getApiCorsOptions(config)

  return options ? handleCors(event, options) : false
}
