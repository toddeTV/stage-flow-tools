import type { UserQuestion } from '~/types'

export default defineEventHandler(async (): Promise<UserQuestion | { message: string }> => {
  const question = await getActiveQuestion()

  if (question) {
    // Strip emojis and notes from the question before sending to the client
    const { note, ...questionForUser } = question
    return {
      ...questionForUser,
      answer_options: question.answer_options.map(option => option.text)
    }
  }

  return { message: 'No active question' }
})