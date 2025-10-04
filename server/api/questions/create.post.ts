import jwt from 'jsonwebtoken'
import type { Question } from '~/types'

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

  const body = await readBody(event) as Omit<Question, 'id' | 'is_locked'>
  const { question_text: raw_question_text, answer_options: raw_answer_options } = body

  // Validate and sanitize question_text
  const question_text = typeof raw_question_text === 'string' ? raw_question_text.trim() : ''
  if (!question_text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question text is required'
    })
  }

  // Validate and sanitize answer_options
  if (!Array.isArray(raw_answer_options)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Answer options must be an array'
    })
  }

  const answer_options = raw_answer_options
    .map(option => typeof option === 'string' ? option.trim() : '')
    .filter(option => option)

  if (answer_options.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least 2 non-empty answer options are required'
    })
  }

  const question = await createQuestion({
    question_text,
    answer_options
  })

  return question
})