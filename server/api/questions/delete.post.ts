import { WebSocketChannel } from '~/types'
import { DeleteQuestionSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const { questionId } = await readValidatedRequestBody<{ questionId: string }>(event, DeleteQuestionSchema)
  const question = await deleteQuestion(questionId)

  if (!question) {
    throwApiError(404, 'quiz.question_not_found')
  }

  if (question.is_active) {
    clearScheduledResultsUpdate(WebSocketChannel.RESULTS)
    broadcast('new-question', null)
    broadcast('results-update', null, WebSocketChannel.RESULTS)
  }

  return {
    questionId,
    success: true,
  }
})
