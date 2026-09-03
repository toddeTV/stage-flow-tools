import type { InputQuestion } from '~/types'
import { QuestionInputSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const questionInput = await readValidatedRequestBody<InputQuestion>(event, QuestionInputSchema)

  let question
  try {
    question = await createQuestion(questionInput)
  }
  catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throwApiError(409, 'quiz.question_key_conflict')
    }
    throw error
  }

  return question
})
