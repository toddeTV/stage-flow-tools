import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  verifyAdmin(event)

  const allQuestions = await getQuestions()
  const activeQuestion = allQuestions.find(q => (q as any).is_active)

  if (activeQuestion) {
    // Deactivate the question
    ;(activeQuestion as any).is_active = false
    await saveQuestions(allQuestions)

    // Clear answers for the unpublished question
    const answers = await getAnswers()
    const remainingAnswers = answers.filter(a => a.question_id !== activeQuestion.id)
    await saveAnswers(remainingAnswers)

    // Broadcast that there is no active question
    broadcast('new-question', null)
    broadcast('results-update', null, WebSocketChannel.RESULTS)
  }

  return { success: true, message: 'Active question unpublished.' }
})