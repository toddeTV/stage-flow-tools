import { createQuestion } from '../../utils/storage'
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
  const { question_text, answer_options } = body
  
  if (!question_text || !answer_options || answer_options.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question text and at least 2 answer options required'
    })
  }
  
  const question = await createQuestion({
    question_text,
    answer_options,
    is_active: false,
    is_locked: false
  })
  
  return question
})