import type { Question } from '~/types'

export default defineEventHandler(async (): Promise<Question | { message: string }> => {
  const question = await getActiveQuestion()
  return question || { message: 'No active question' }
})