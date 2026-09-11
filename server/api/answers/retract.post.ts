import { AnswerRetractSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  const { user_id, question_id } = await readValidatedRequestBody<{
    question_id: string
    user_id: string
  }>(event, AnswerRetractSchema)

  await retractAnswer(user_id, question_id)

  requestResultsUpdate()

  return { success: true }
})
