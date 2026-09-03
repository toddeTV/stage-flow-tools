import { WebSocketChannel } from '~/types'
import { EmptyRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  await readValidatedRequestBody(event, EmptyRequestSchema)

  const deactivated = await unpublishActiveQuestion()

  if (deactivated) {
    // Broadcast that there is no active question
    broadcast('new-question', null)
    broadcast('results-update', null, WebSocketChannel.RESULTS)
  }

  return { success: true, message: 'Active question unpublished.' }
})
