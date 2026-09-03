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
function getBearerToken(headers: Headers): string | undefined {
  const authorization = headers.get('authorization')
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()

  return token || undefined
}

function getCookieToken(headers: Headers): string | undefined {
  const cookieHeader = headers.get('cookie')

  if (!cookieHeader) {
    return undefined
  }

  for (const cookie of cookieHeader.split(';')) {
    const [
      name,
      ...valueParts
    ] = cookie.trim().split('=')

    if (name === 'admin_token') {
      try {
        return decodeURIComponent(valueParts.join('=')) || undefined
      }
      catch {
        return undefined
      }
    }
  }

  return undefined
}

function getTokenFromHeaders(headers: Headers): string | undefined {
  return getBearerToken(headers) || getCookieToken(headers)
}

/**
 * Extracts the admin auth token from cookies or headers.
 * @param event The H3 event object.
 * @returns The token string or undefined.
 */
export function getToken(event: H3Event): string | undefined {
  return getTokenFromHeaders(event.headers)
}

/** Persists a verified header token into the standard admin cookie for subsequent browser requests. */
export function syncAdminCookieFromHeaderToken(event: H3Event, maxAge = 60 * 60 * 24) {
  const headerToken = getBearerToken(event.headers)

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
  return verifyAdminToken(getToken(event), useRuntimeConfig(event))
}

/** Verifies the admin credentials from a WebSocket upgrade request. */
export async function verifyAdminWebSocket(request: Pick<Request, 'headers'>) {
  return verifyAdminToken(getTokenFromHeaders(request.headers), useRuntimeConfig())
}

async function verifyAdminToken(
  token: string | undefined,
  config: { adminToken: string, jwtSecret: string },
) {

  if (!token) {
    throwApiError(401, 'auth.token_required')
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
    throwApiError(401, 'auth.token_invalid')
  }
}
