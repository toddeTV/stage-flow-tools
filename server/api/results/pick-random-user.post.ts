import type { Answer } from '~/types'

export default defineEventHandler(async (event) => {
  verifyAdmin(event)

  const body = await readBody(event) as { questionId: string, option: string }
  const { questionId, option } = body

  if (!questionId || !option) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing questionId or option'
    })
  }

  try {
    const questionAnswers = await getAnswersForQuestion(questionId)

    if (!questionAnswers || questionAnswers.length === 0) {
      return createError({ statusCode: 404, statusMessage: 'No answers found for this question' })
    }

    const usersForOption = questionAnswers
      .filter((userAnswer: Answer) => userAnswer.selected_answer === option)

    if (usersForOption.length === 0) {
      return createError({ statusCode: 404, statusMessage: 'No users found for this option' })
    }

    const randomIndex = Math.floor(Math.random() * usersForOption.length)
    const randomUser = usersForOption[randomIndex]

    sendToUser(randomUser.user_id, 'winner-selected', {
      userId: randomUser.user_id,
      username: randomUser.user_nickname,
      questionId,
      option
    })

    event.node.res.statusCode = 204
    return ''
  }
  catch (error: unknown) {
    logger_error('Failed to pick random user', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})