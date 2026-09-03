import { WebSocketChannel, type LocalizedString } from '~/types'
import { AnswerSubmitSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  const {
    selected_answer,
    user_id,
    user_nickname,
  } = await readValidatedRequestBody<{
    selected_answer: LocalizedString
    user_id: string
    user_nickname: string
  }>(event, AnswerSubmitSchema)

  // Get active question
  const activeQuestion = await getActiveQuestion()

  if (!activeQuestion) {
    throwApiError(404, 'quiz.no_active_question')
  }

  if (activeQuestion.is_locked) {
    throwApiError(403, 'quiz.question_locked')
  }

  // Normalize and validate answer
  const answerOptions = activeQuestion.answer_options
    .map(opt => opt.text.en?.toLowerCase())
    .filter((v): v is string => typeof v === 'string')
  const selectedAnswerNormalized = selected_answer.en.toLowerCase()

  if (!answerOptions.includes(selectedAnswerNormalized)) {
    throwApiError(400, 'quiz.invalid_answer')
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
  const results = await getCurrentResults()
  if (results) {
    scheduleResultsUpdate(results, WebSocketChannel.RESULTS)
  }

  return { success: true }
})
