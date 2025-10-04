import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const token = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No token provided'
    })
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    return { valid: true, user: decoded }
  }
  catch (error: unknown) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }
})