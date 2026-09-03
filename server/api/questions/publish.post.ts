import { WebSocketChannel } from '~/types'
import { PublishQuestionSchema } from '#shared/utils/validation'
import { serializePublicQuestion } from '../../utils/public-question'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const { key } = await readValidatedRequestBody<{ key: string }>(event, PublishQuestionSchema)

  const question = await publishQuestion(key)

  if (!question) {
    throwApiError(404, 'quiz.question_not_found')
  }

  // Broadcast new question to all connected clients
  broadcast('new-question', serializePublicQuestion(question))

  // Also broadcast an empty results update to clear previous results
  const results = await getResultsForQuestion(question.id)
  if (results) {
    scheduleResultsUpdate(results, WebSocketChannel.RESULTS)
  }

  return question
})
