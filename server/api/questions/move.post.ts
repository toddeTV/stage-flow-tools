import { MoveQuestionSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const {
    direction,
    questionId,
  } = await readValidatedRequestBody<{
    direction: 'up' | 'down'
    questionId: string
  }>(event, MoveQuestionSchema)
  const question = await moveQuestion(questionId, direction)

  if (!question) {
    throwApiError(404, 'quiz.question_not_found')
  }

  return question
})
