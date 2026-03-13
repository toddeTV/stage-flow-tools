import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const body = await readBody(event) as { questionId?: string }
  const { questionId } = body

  if (!questionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question ID required',
    })
  }

  const question = await toggleQuestionLock(questionId)

  if (!question) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Question not found',
    })
  }

  // Broadcast lock status change
  if (question) {
    await broadcast(event, 'lock-status', { questionId, is_locked: question.is_locked })

    // Also broadcast a results update
    const { totalConnections } = await getConnections(event)
    const results = await getResultsForQuestion(questionId, totalConnections)
    if (results) {
      await scheduleResultsUpdate(event, results, WebSocketChannel.RESULTS)
    }
  }

  return question
})
