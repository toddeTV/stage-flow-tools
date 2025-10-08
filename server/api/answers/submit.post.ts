import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { user_id, user_nickname, selected_answer } = body as {
    user_id: string,
    user_nickname: string,
    selected_answer: string
  }

  if (!user_id || !user_nickname || !selected_answer) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID, nickname and answer required'
    })
  }

  // Get active question
  const activeQuestion = await getActiveQuestion()

  if (!activeQuestion) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No active question'
    })
  }

  if (activeQuestion.is_locked) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Question is locked'
    })
  }

  // Normalize and validate answer
  // Normalize and validate answer
  const answerOptions = activeQuestion.answer_options.map(opt => opt.text.toLowerCase())
  const selectedAnswerNormalized = selected_answer.toLowerCase()

  if (!answerOptions.includes(selectedAnswerNormalized)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid answer'
    })
  }

  // Find the original-cased answer option
  const originalAnswer = activeQuestion.answer_options.find(opt => opt.text.toLowerCase() === selectedAnswerNormalized)

  // Submit answer
  await submitAnswer({
    question_id: activeQuestion.id,
    user_id,
    user_nickname,
    selected_answer: originalAnswer ? originalAnswer.text : selected_answer
  })

  // Schedule bundled results update
  const results = await getCurrentResults()
  if (results) {
    scheduleResultsUpdate(results, WebSocketChannel.RESULTS)
  }

  return { success: true }
})