import type { Results } from '~/types'
import { PresenterQuestionQuerySchema } from '#shared/utils/validation'

/** Aggregate state for a stable key, including inactive questions and retained answers. */
export default defineApiHandler(async (event): Promise<Results> => {
  await verifyAdmin(event)
  const { key } = parseValidatedValue<{ key: string }>(getQuery(event), PresenterQuestionQuerySchema)
  const question = (await getQuestions()).find(item => item.key === key && !item.is_disabled)
  if (!question) throwApiError(404, 'quiz.question_not_found')
  const results = await getResultsForQuestion(question.id)
  if (!results) throwApiError(404, 'quiz.question_not_found')
  return results
})
