import { normalizeQuestionInput, QuestionInputValidationError } from '#shared/utils/validation'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  let questionInput

  try {
    questionInput = normalizeQuestionInput(await readBody(event))
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
    question = await createQuestion(questionInput)
  }
  catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A question with this key already exists',
      })
    }
    throw error
  }

  return question
})
