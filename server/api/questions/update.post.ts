import { normalizeQuestionInput, QuestionInputValidationError } from '#shared/utils/validation'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const body = await readBody(event) as { questionId?: unknown } & Record<string, unknown>
  const questionId = typeof body.questionId === 'string' ? body.questionId.trim() : ''

  if (!questionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question ID is required',
    })
  }

  let questionInput

  try {
    questionInput = normalizeQuestionInput(body)
  }
  catch (error: unknown) {
    if (error instanceof QuestionInputValidationError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    throw error
  }

  let question

  try {
    question = await updateQuestion(questionId, questionInput)
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        throw createError({
          statusCode: 409,
          statusMessage: 'A question with this key already exists',
        })
      }

      if (
        error.message === 'Active questions cannot be edited'
        || error.message === 'Published questions cannot be edited'
      ) {
        throw createError({
          statusCode: 409,
          statusMessage: error.message,
        })
      }
    }

    throw error
  }

  if (!question) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Question not found',
    })
  }

  return question
})
