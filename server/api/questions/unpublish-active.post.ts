import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const deactivated = await unpublishActiveQuestion()

  if (deactivated) {
    // Broadcast that there is no active question
    await broadcast(event, 'new-question', null)
    await broadcast(event, 'results-update', null, WebSocketChannel.RESULTS)
  }

  return { success: true, message: 'Active question unpublished.' }
})
