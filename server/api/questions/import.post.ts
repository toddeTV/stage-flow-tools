import type { QuestionPackage } from '~/types'
import { WebSocketChannel } from '~/types'
import { QuestionPackageSchema } from '#shared/utils/validation'
import { serializePublicQuestion } from '../../utils/public-question'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const questionPackage = await readValidatedRequestBody<QuestionPackage>(event, QuestionPackageSchema)
  const result = await importQuestionPackage(questionPackage)

  if (result.activeQuestion) {
    clearScheduledResultsUpdate(WebSocketChannel.RESULTS)
    broadcast('new-question', serializePublicQuestion(result.activeQuestion))

    const results = await getResultsForQuestion(result.activeQuestion.id)
    broadcast('results-update', results, WebSocketChannel.RESULTS)
  }

  return {
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
  }
})
