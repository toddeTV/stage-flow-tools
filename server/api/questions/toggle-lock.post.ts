export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const { questionId, locked } = await readValidatedRequestBody<{
    questionId: string, locked?: boolean
  }>(event, ToggleQuestionLockSchema)

  const question = await toggleQuestionLock(questionId, locked)

  if (!question) {
    throwApiError(404, 'quiz.question_not_found')
  }

  // Broadcast lock status change
  if (question) {
    broadcast('lock-status', { questionId, is_locked: question.is_locked })

    requestResultsUpdate()
  }

  return question
})
