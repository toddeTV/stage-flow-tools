import type { UserQuestion } from '~/types'

export default defineEventHandler(async (): Promise<UserQuestion | { message: string }> => {
  const question = await getActiveQuestion()

  if (question) {
    // Strip emojis from answer options before sending to the client
    return {
      ...question,
      answer_options: question.answer_options.map(option => option.text)
    }
  }

  return { message: 'No active question' }
})