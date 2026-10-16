import type { QuestionPackage } from '~/types'
import { getQuery } from 'h3'
import { QuestionPackageImportQuerySchema, QuestionPackageSchema } from '#shared/utils/validation'
import { getBuildCommitSha } from '../../utils/build-info'
import { QuestionKeyConflictError } from '../../utils/storage'

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
  try {
    return await importQuestionPackage(questionPackage)
  }
  catch (error: unknown) {
    if (error instanceof QuestionKeyConflictError) {
      throwApiError(409, 'quiz.question_key_conflict')
    }
    throw error
  }
})
