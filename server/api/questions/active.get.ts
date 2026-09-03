import type { PublicQuestion } from '../../utils/public-question'
import { serializePublicQuestion } from '../../utils/public-question'

export default defineApiHandler(async (): Promise<PublicQuestion | { message: string }> => {
  const question = await getActiveQuestion()

  if (question) {
    return serializePublicQuestion(question)
  }

  return { message: 'No active question' }
})
