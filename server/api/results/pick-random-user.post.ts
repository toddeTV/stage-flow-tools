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
      return { username: null }
    }

    const usersForOption = questionAnswers
      .filter((userAnswer: Answer) => userAnswer.selected_answer === option)
      .map((userAnswer: Answer) => userAnswer.user_nickname)

    if (usersForOption.length === 0) {
      return { username: null }
    }

    const randomIndex = Math.floor(Math.random() * usersForOption.length)
    const randomUsername = usersForOption[randomIndex]

    return { username: randomUsername }
  }
  catch (error: unknown) {
    logger_error('Failed to pick random user', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})