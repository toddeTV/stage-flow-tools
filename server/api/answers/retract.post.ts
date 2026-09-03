import { WebSocketChannel } from '~/types'
import { AnswerRetractSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  const { user_id, question_id } = await readValidatedRequestBody<{
    question_id: string
    user_id: string
  }>(event, AnswerRetractSchema)

  await retractAnswer(user_id, question_id)

  // Schedule bundled results update
  const results = await getCurrentResults()
  if (results) {
    scheduleResultsUpdate(results, WebSocketChannel.RESULTS)
  }

  return { success: true }
})
