import type { Question } from '~/types'

export default defineEventHandler(async (): Promise<Question | { message: string }> => {
  const question = await getActiveQuestion()

  if (question) {
    return question
  }

  return { message: 'No active question' }
})