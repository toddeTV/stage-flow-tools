import type { LocalizedString } from '~/types'
import { AnswerSubmitSchema } from '#shared/utils/validation'
import { AnswerSubmissionError } from '../../utils/storage'

export default defineApiHandler(async (event) => {
  const {
    question_id,
    selected_answer,
    user_id,
    user_nickname,
  } = await readValidatedRequestBody<{
    question_id: string
    selected_answer: LocalizedString
    user_id: string
    user_nickname: string
  }>(event, AnswerSubmitSchema)

  // Get active question
  const activeQuestion = await getActiveQuestion()

  if (!activeQuestion) {
    throwApiError(404, 'quiz.no_active_question')
  }

  if (activeQuestion.id !== question_id) {
    throwApiError(409, 'quiz.question_changed')
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
  try {
    await submitAnswer({
      question_id,
      user_id,
      user_nickname,
      selected_answer: originalAnswer ? originalAnswer.text : selected_answer,
    })
  }
  catch (error: unknown) {
    if (error instanceof AnswerSubmissionError) {
      const status = error.reason === 'question_changed' ? 409 : error.reason === 'question_locked' ? 403 : 400
      throwApiError(status, `quiz.${error.reason}`)
    }
    throw error
  }

  requestResultsUpdate()

  return { success: true }
})
