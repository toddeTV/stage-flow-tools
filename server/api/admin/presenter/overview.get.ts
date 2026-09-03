import type { PresenterQuestionsOverview } from '~/types'

export default defineApiHandler(async (event): Promise<PresenterQuestionsOverview> => {
  await verifyAdmin(event)

  return await getPresenterQuestionsOverview()
})
