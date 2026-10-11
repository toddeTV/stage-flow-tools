import { WebSocketChannel } from '~/types'
import { EmptyRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  await readValidatedRequestBody(event, EmptyRequestSchema)

  const questionIds = await resetQuiz()

  cancelPendingResultsUpdate()
  for (const questionId of questionIds) {
    broadcast('answers-reset', { questionId }, WebSocketChannel.DEFAULT)
  }
  broadcast('new-question', null)
  broadcast('results-update', null, WebSocketChannel.RESULTS)

  return {
    resetQuestionCount: questionIds.length,
    success: true,
  }
})
