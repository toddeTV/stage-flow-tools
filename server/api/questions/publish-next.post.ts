import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const allQuestions = await getQuestions()

  // Sort questions by creation date to find the next one reliably
  const sortedQuestions = allQuestions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const nextQuestion = sortedQuestions.find(q => !q.alreadyPublished)

  if (!nextQuestion) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No more unpublished questions found.',
    })
  }

  const question = await publishQuestion(nextQuestion.id)

  if (!question) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to publish the next question.',
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
