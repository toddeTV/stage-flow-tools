import type { Question } from '~/types'

export default defineEventHandler(async (): Promise<Omit<Question, 'note' | 'key' | 'alreadyPublished'> | { message: string }> => {
  const question = await getActiveQuestion()

  if (question) {
    const { note, key, alreadyPublished, ...publicQuestion } = question
    return {
      ...publicQuestion,
      answer_options: question.answer_options.map(({ text }) => ({ text }))
    }
  }

  return { message: 'No active question' }
})