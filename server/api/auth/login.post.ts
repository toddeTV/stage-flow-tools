import { validateAdmin } from '../../utils/storage'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const { username, password } = body
  
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
  
  return { token }
})