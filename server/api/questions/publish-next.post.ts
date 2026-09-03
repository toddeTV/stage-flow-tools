import { WebSocketChannel } from '~/types'
import { EmptyRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  await readValidatedRequestBody(event, EmptyRequestSchema)

  const nextQuestion = await getNextPublishableQuestion()

  if (!nextQuestion) {
    throwApiError(404, 'quiz.no_unpublished_question')
  }

  const question = await publishQuestion(nextQuestion.id)

  if (!question) {
    throwApiError(500, 'quiz.publish_next_failed')
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
