import { WebSocketChannel } from '~/types'
import { EmptyRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  await readValidatedRequestBody(event, EmptyRequestSchema)

  const activeQuestion = await getActiveQuestion()

  if (!activeQuestion) {
    throwApiError(404, 'quiz.no_active_question')
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
