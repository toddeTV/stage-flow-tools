import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const body = await readBody(event) as { key?: string }
  const { key } = body

  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question key is required',
    })
  }

  const question = await publishQuestion(key)

  if (!question) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Question not found',
    })
  }

  // Broadcast new question to all connected clients
  broadcast('new-question', question)

  // Also broadcast an empty results update to clear previous results
  const results = await getResultsForQuestion(question.id)
  if (results) {
    scheduleResultsUpdate(results, WebSocketChannel.RESULTS)
  }

  return question
})
