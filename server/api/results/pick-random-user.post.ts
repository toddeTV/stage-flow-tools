import type { Answer } from '~/types'
import { WebSocketChannel } from '~/types'
import { PickRandomUserSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const { questionId, option } = await readValidatedRequestBody<{
    option: string
    questionId: string
  }>(event, PickRandomUserSchema)

  try {
    const questionAnswers = await getAnswersForQuestion(questionId)

    if (!questionAnswers || questionAnswers.length === 0) {
      throwApiError(404, 'answer.no_answers_for_question')
    }

    const usersForOption = questionAnswers
      .filter((userAnswer: Answer) => userAnswer.selected_answer.en === option)

    if (usersForOption.length === 0) {
      throwApiError(404, 'answer.no_users_for_option')
    }

    const randomIndex = Math.floor(Math.random() * usersForOption.length)
    const randomUser = usersForOption[randomIndex]!

    const delivered = sendToUser(randomUser.user_id, 'winner-selected', {
      userId: randomUser.user_id,
      username: randomUser.user_nickname,
      questionId,
      option,
    }, WebSocketChannel.DEFAULT)

    if (!delivered) {
      throwApiError(503, 'websocket.winner_not_connected')
    }

    event.node.res.statusCode = 204
    return ''
  }
  catch (error: unknown) {
    if (error && typeof error === 'object' && 'data' in error) {
      throw error
    }
    logger_error('Failed to pick random user', error)
    throwApiError(500, 'server.internal_error')
  }
})
