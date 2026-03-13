import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { user_id, question_id } = body as { user_id: string, question_id: string }

  if (!user_id || !question_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID and question ID required',
    })
  }

  await retractAnswer(user_id, question_id)

  // Schedule bundled results update
  const { totalConnections } = await getConnections(event)
  const results = await getCurrentResults(totalConnections)
  if (results) {
    await scheduleResultsUpdate(event, results, WebSocketChannel.RESULTS)
  }

  return { success: true }
})
