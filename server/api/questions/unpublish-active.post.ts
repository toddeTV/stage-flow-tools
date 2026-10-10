import { WebSocketChannel } from '~/types'
import { UnpublishQuestionSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  const input = await readValidatedRequestBody<{ expectedKey?: string } | undefined>(event, UnpublishQuestionSchema)

  const deactivated = await unpublishActiveQuestion(input?.expectedKey)

  if (deactivated) {
    // Broadcast that there is no active question
    cancelPendingResultsUpdate()
    broadcast('new-question', null)
    broadcast('results-update', null, WebSocketChannel.RESULTS)
  }

  return { success: true, message: 'Active question unpublished.' }
})
