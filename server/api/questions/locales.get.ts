import { collectQuestionLocales } from '#shared/utils/question-locales'

/** Public metadata only; the complete question collection remains admin-only. */
export default defineApiHandler(async (): Promise<string[]> => {
  return collectQuestionLocales(await getQuestions())
})
