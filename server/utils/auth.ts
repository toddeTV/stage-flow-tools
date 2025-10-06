import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

/**
 * Extracts the JWT from cookies or headers.
 * @param event The H3 event object.
 * @returns The token string or undefined.
 */
export function getToken(event: H3Event): string | undefined {
  return getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
}

/**
 * Verifies the admin token from cookies or headers.
 * Throws an error if the token is missing or invalid.
 * @param event The H3 event object.
 */
export function verifyAdmin(event: H3Event) {
  const config = useRuntimeConfig(event)
  const token = getToken(event)

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    jwt.verify(token, config.jwtSecret)
  }
  catch (error: unknown) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }
}