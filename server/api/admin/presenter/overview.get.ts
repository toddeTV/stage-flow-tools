import type { PresenterQuestionsOverview } from '~/types'

export default defineEventHandler(async (event): Promise<PresenterQuestionsOverview> => {
  await verifyAdmin(event)

  return await getPresenterQuestionsOverview()
})
