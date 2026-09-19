import type { H3Event } from 'h3'

export {
  initStorage,
} from '../database/storage/core'
export {
  createQuestion,
  getActiveQuestion,
  getQuestions,
  importQuestionPackage,
  QuestionAnswerOptionsResetRequiredError,
  updateQuestion,
} from '../database/storage/questions'
export type { QuestionPackageImportResult } from '../database/storage/questions'
export {
  deleteAllQuestions,
  deleteQuestion,
  getNextPublishableQuestion,
  moveQuestion,
  publishQuestion,
  toggleQuestionDisabled,
  toggleQuestionLock,
  unpublishActiveQuestion,
} from '../database/storage/question-queue'
export {
  clearAnswersForQuestion,
  getAnswers,
  getAnswersForQuestion,
  retractAnswer,
  submitAnswer,
} from '../database/storage/answers'
export {
  getCurrentResults,
  getResultsForQuestion,
} from '../database/storage/results'

export async function validateAdmin(username: string, password: string, event?: H3Event): Promise<boolean> {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()

  return config.adminUsername === username && config.adminPassword === password
}
