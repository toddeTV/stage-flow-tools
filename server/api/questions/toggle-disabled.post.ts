import { ToggleQuestionDisabledSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const { questionId } = await readValidatedRequestBody<{ questionId: string }>(event, ToggleQuestionDisabledSchema)
  const question = await toggleQuestionDisabled(questionId)

  if (!question) {
    throwApiError(404, 'quiz.question_not_found')
  }

  return question
})
