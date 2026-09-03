import type { InputQuestion } from '~/types'
import { WebSocketChannel } from '~/types'
import { QuestionUpdateSchema } from '#shared/utils/validation'
import { QuestionAnswerOptionsResetRequiredError } from '../../utils/storage'
import { serializePublicQuestion } from '../../utils/public-question'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const {
    questionId,
    resetAnswers,
    ...questionInput
  } = await readValidatedRequestBody<InputQuestion & { questionId: string, resetAnswers: boolean }>(
    event,
    QuestionUpdateSchema,
  )

  let update

  try {
    update = await updateQuestion(questionId, questionInput, { resetAnswers })
  }
  catch (error: unknown) {
    if (error instanceof QuestionAnswerOptionsResetRequiredError) {
      throwApiError(409, 'quiz.question_answers_reset_required')
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        throwApiError(409, 'quiz.question_key_conflict')
      }

    }

    throw error
  }

  if (!update) {
    throwApiError(404, 'quiz.question_not_found')
  }

  const { question, answersReset } = update

  if (answersReset) {
    broadcast('answers-reset', { questionId: question.id }, WebSocketChannel.DEFAULT)
  }

  if (question.is_active) {
    clearScheduledResultsUpdate(WebSocketChannel.RESULTS)
    broadcast('new-question', serializePublicQuestion(question))

    const results = await getResultsForQuestion(question.id)
    broadcast('results-update', results, WebSocketChannel.RESULTS)
  }

  return question
})
