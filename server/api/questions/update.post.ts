import type { InputQuestion } from '~/types'
import { QuestionUpdateSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const {
    questionId,
    ...questionInput
  } = await readValidatedRequestBody<InputQuestion & { questionId: string }>(event, QuestionUpdateSchema)

  let question

  try {
    question = await updateQuestion(questionId, questionInput)
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        throwApiError(409, 'quiz.question_key_conflict')
      }

    }

    throw error
  }

  if (!question) {
    throwApiError(404, 'quiz.question_not_found')
  }

  if (question.is_active) {
    broadcast('new-question', question)
  }

  return question
})
