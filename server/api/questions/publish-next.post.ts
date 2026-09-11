import { WebSocketChannel } from '~/types'
import { EmptyRequestSchema } from '#shared/utils/validation'
import { serializePublicQuestion } from '../../utils/public-question'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  await readValidatedRequestBody(event, EmptyRequestSchema)

  const nextQuestion = await getNextPublishableQuestion()

  if (!nextQuestion) {
    throwApiError(404, 'quiz.no_enabled_question')
  }

  const question = await publishQuestion(nextQuestion.id)

  if (!question) {
    throwApiError(500, 'quiz.publish_next_failed')
  }

  // Broadcast new question to all connected clients
  broadcast('new-question', serializePublicQuestion(question))

  cancelPendingResultsUpdate()
  const results = await getResultsForQuestion(question.id)
  broadcast('results-update', results, WebSocketChannel.RESULTS)

  return question
})
