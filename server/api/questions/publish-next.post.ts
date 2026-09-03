import { WebSocketChannel } from '~/types'
import { EmptyRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)
  await readValidatedRequestBody(event, EmptyRequestSchema)

  const allQuestions = await getQuestions()

  // Sort questions by creation date to find the next one reliably
  const sortedQuestions = allQuestions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const nextQuestion = sortedQuestions.find(q => !q.alreadyPublished)

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
