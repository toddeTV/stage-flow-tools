import { WebSocketChannel, type LocalizedString } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid payload',
    })
  }

  const user_id = typeof body.user_id === 'string' ? body.user_id.trim() : ''
  const user_nickname = typeof body.user_nickname === 'string' ? body.user_nickname.trim() : ''
  const selected_answer = body.selected_answer as LocalizedString | undefined

  if (
    !user_id
    || !user_nickname
    || !selected_answer
    || typeof selected_answer.en !== 'string' || !selected_answer.en.trim()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID, nickname and answer required',
    })
  }

  // Update selected_answer with trimmed value to reuse it safely
  selected_answer.en = selected_answer.en.trim()

  // Get active question
  const activeQuestion = await getActiveQuestion()

  if (!activeQuestion) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No active question',
    })
  }

  if (activeQuestion.is_locked) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Question is locked',
    })
  }

  // Normalize and validate answer
  const answerOptions = activeQuestion.answer_options
    .map(opt => opt.text.en?.toLowerCase())
    .filter((v): v is string => typeof v === 'string')
  const selectedAnswerNormalized = selected_answer.en.toLowerCase()

  if (!answerOptions.includes(selectedAnswerNormalized)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid answer',
    })
  }

  // Find the original-cased answer option
  const originalAnswer = activeQuestion.answer_options.find(
    opt => opt.text.en?.toLowerCase() === selectedAnswerNormalized,
  )

  // Submit answer
  await submitAnswer({
    question_id: activeQuestion.id,
    user_id,
    user_nickname,
    selected_answer: originalAnswer ? originalAnswer.text : selected_answer,
  })

  // Schedule bundled results update
  const { totalConnections } = await getConnections(event)
  const results = await getCurrentResults(totalConnections)
  if (results) {
    await scheduleResultsUpdate(event, results, WebSocketChannel.RESULTS)
  }

  return { success: true }
})
