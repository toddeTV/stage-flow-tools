
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { user_nickname, selected_answer } = body as { user_nickname: string, selected_answer: string }

  if (!user_nickname || !selected_answer) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nickname and answer required'
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

  // Submit answer
  await submitAnswer({
    question_id: activeQuestion.id,
    user_nickname,
    selected_answer
  })

  // Schedule bundled results update
  const results = await getCurrentResults()
  if (results) {
    scheduleResultsUpdate(results)
  }

  return { success: true }
})