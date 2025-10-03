import { publishQuestion } from '../../utils/storage'
import { broadcast } from '../../utils/websocket'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Verify admin token
  const token = getCookie(event, 'admin-token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
  
  try {
    jwt.verify(token, config.jwtSecret)
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }
  
  const body = await readBody(event)
  const { questionId } = body
  
  if (!questionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question ID required'
    })
  }
  
  const question = await publishQuestion(questionId)
  
  // Broadcast new question to all connected clients
  broadcast('new-question', question)
  
  return question
})