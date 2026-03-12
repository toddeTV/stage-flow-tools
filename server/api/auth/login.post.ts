import { SignJWT } from 'jose'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const { username, password } = body as { username?: string, password?: string }

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username and password required',
    })
  }

  const isValid = await validateAdmin(username, password, event)

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials',
    })
  }

  // Generate token
  const secret = new TextEncoder().encode(config.jwtSecret)
  const token = await new SignJWT({ username, isAdmin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret)

  setAdminCookie(event, token, 60 * 60 * 24) // 24 hours

  return {
    success: true,
  }
})
