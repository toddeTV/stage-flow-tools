import { WebSocketChannel } from '~/types'
import { ToggleQuestionLockSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const { questionId } = await readValidatedRequestBody<{ questionId: string }>(event, ToggleQuestionLockSchema)

  const question = await toggleQuestionLock(questionId)

  if (!question) {
    throwApiError(404, 'quiz.question_not_found')
  }

  // Broadcast lock status change
  if (question) {
    broadcast('lock-status', { questionId, is_locked: question.is_locked })

    // Also broadcast a results update
    const results = await getResultsForQuestion(questionId)
    if (results) {
      scheduleResultsUpdate(results, WebSocketChannel.RESULTS)
    }
  }

  return question
})
