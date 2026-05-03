import { jwtVerify } from 'jose'
import type { H3Event } from 'h3'

type VerifiedAdminPayload = {
  authMethod?: 'static-token'
  isAdmin: true
  username: string
}

/** Sets the admin_token cookie with protocol-aware security attributes. */
export function setAdminCookie(event: H3Event, value: string, maxAge: number) {
  const isSecure = getRequestProtocol(event) === 'https'
  setCookie(event, 'admin_token', value, {
    httpOnly: true,
    path: '/',
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    maxAge,
  })
}

/** Extracts a bearer token from the Authorization header. */
function getBearerToken(event: H3Event): string | undefined {
  const authorization = getHeader(event, 'authorization')
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()

  return token || undefined
}

/**
 * Extracts the admin auth token from cookies or headers.
 * @param event The H3 event object.
 * @returns The token string or undefined.
 */
export function getToken(event: H3Event): string | undefined {
  return getBearerToken(event) || getCookie(event, 'admin_token')
}

/** Persists a verified header token into the standard admin cookie for subsequent browser requests. */
export function syncAdminCookieFromHeaderToken(event: H3Event, maxAge = 60 * 60 * 24) {
  const headerToken = getBearerToken(event)

  if (!headerToken || getCookie(event, 'admin_token') === headerToken) {
    return
  }

  setAdminCookie(event, headerToken, maxAge)
}

function getStaticAdminPayload(token: string, configuredToken: string): VerifiedAdminPayload | null {
  if (!configuredToken || token !== configuredToken) {
    return null
  }

  return {
    authMethod: 'static-token',
    isAdmin: true,
    username: 'admin-token',
  }
}

/**
 * Verifies the admin token from cookies or headers.
 * Throws an error if the token is missing or invalid.
 * @param event The H3 event object.
 */
export async function verifyAdmin(event: H3Event) {
  const config = useRuntimeConfig(event)
  const token = getToken(event)

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const staticAdminPayload = getStaticAdminPayload(token, config.adminToken)

  if (staticAdminPayload) {
    return staticAdminPayload
  }

  try {
    const secret = new TextEncoder().encode(config.jwtSecret)
    const { payload } = await jwtVerify(token, secret, { algorithms: [
      'HS256',
    ] })
    return payload
  }
  catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token',
    })
  }
}
