import type { QuestionPackage } from '~/types'
import { WebSocketChannel } from '~/types'
import { getQuery } from 'h3'
import { QuestionPackageImportQuerySchema, QuestionPackageSchema } from '#shared/utils/validation'
import { getBuildCommitSha } from '../../utils/build-info'
import { serializePublicQuestion } from '../../utils/public-question'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const questionPackage = await readValidatedRequestBody<QuestionPackage>(event, QuestionPackageSchema)
  const { confirmedCommitSha } = parseValidatedValue<{ confirmedCommitSha?: string }>(
    getQuery(event),
    QuestionPackageImportQuerySchema,
  )
  const commitSha = getBuildCommitSha()
  if ((!commitSha || (questionPackage.commitSha && questionPackage.commitSha !== commitSha))
    && confirmedCommitSha !== (commitSha ?? 'unknown')) {
    throwApiError(409, 'quiz.question_package_commit_confirmation_required')
  }
  const result = await importQuestionPackage(questionPackage)

  if (result.activeQuestion) {
    cancelPendingResultsUpdate()
    broadcast('new-question', serializePublicQuestion(result.activeQuestion))

    const results = await getResultsForQuestion(result.activeQuestion.id)
    broadcast('results-update', results, WebSocketChannel.RESULTS)
  }

  return {
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
  }
})
