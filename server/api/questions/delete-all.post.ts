import { WebSocketChannel } from '~/types'
import { EmptyRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  await readValidatedRequestBody(event, EmptyRequestSchema)

  const deletedQuestionCount = await deleteAllQuestions()

  cancelPendingResultsUpdate()
  broadcast('new-question', null)
  broadcast('results-update', null, WebSocketChannel.RESULTS)

  return {
    deletedQuestionCount,
    success: true,
  }
})
