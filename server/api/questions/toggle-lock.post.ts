import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Verify admin token
  const token = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  
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

  const body = await readBody(event) as { questionId?: string }
  const { questionId } = body

  if (!questionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question ID required'
    })
  }

  const question = await toggleQuestionLock(questionId)

  if (!question) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Question not found'
    })
  }

  // Broadcast lock status change
  if (question) {
    broadcast('lock-status', { questionId, is_locked: question.is_locked })
  }

  return question
})