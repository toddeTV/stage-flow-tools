import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const { username, password } = body as { username?: string, password?: string }
  
  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username and password required'
    })
  }
  
  const isValid = await validateAdmin(username, password, event)
  
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials'
    })
  }
  
  // Generate token
  const token = jwt.sign(
    { username, isAdmin: true },
    config.jwtSecret,
    { expiresIn: '24h' }
  )
  
  const isSecure = getRequestProtocol(event) === 'https'

  setCookie(event, 'admin_token', token, {
    httpOnly: true,
    path: '/',
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    maxAge: 60 * 60 * 24 // 24 hours
  })

  return {
    success: true
  }
})