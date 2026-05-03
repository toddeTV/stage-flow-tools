import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const activeQuestion = await getActiveQuestion()

  if (!activeQuestion) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No active question',
    })
  }

  await clearAnswersForQuestion(activeQuestion.id)

  const results = await getResultsForQuestion(activeQuestion.id)

  broadcast('answers-reset', { questionId: activeQuestion.id }, WebSocketChannel.DEFAULT)

  if (results) {
    broadcast('results-update', results, WebSocketChannel.RESULTS)
  }

  return {
    success: true,
    questionId: activeQuestion.id,
  }
})
