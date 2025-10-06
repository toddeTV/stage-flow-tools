export default defineEventHandler(async (event) => {
  verifyAdmin(event)

  const body = await readBody(event) as { questionId?: string }
  const { questionId } = body

  if (!questionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question ID required'
    })
  }

  const question = await publishQuestion(questionId)

  if (!question) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Question not found'
    })
  }

  // Broadcast new question to all connected clients
  broadcast('new-question', question)

  return question
})