import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { user_id, question_id } = body as { user_id: string, question_id: string }

  if (!user_id || !question_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID and question ID required'
    })
  }

  await retractAnswer(user_id, question_id)

  // Schedule bundled results update
  const results = await getCurrentResults()
  if (results) {
    scheduleResultsUpdate(results, WebSocketChannel.RESULTS)
  }

  return { success: true }
})