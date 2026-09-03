import { SignJWT } from 'jose'
import { LoginRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { username, password } = await readValidatedRequestBody<{
    password: string
    username: string
  }>(event, LoginRequestSchema)

  const isValid = await validateAdmin(username, password, event)

  if (!isValid) {
    throwApiError(401, 'auth.credentials_invalid')
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
