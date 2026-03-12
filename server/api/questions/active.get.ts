import type { Question, LocalizedString } from '~/types'

type PublicQuestion = Omit<Question, 'note' | 'key' | 'alreadyPublished' | 'answer_options'> & {
  answer_options: { text: LocalizedString }[]
}

export default defineEventHandler(async (): Promise<PublicQuestion | { message: string }> => {
  const question = await getActiveQuestion()

  if (question) {
    const { note, key, alreadyPublished, answer_options, ...rest } = question
    return {
      ...rest,
      answer_options: answer_options.map(({ text }) => ({ text })),
    }
  }

  return { message: 'No active question' }
})
