import type { PresenterCurrentState } from '~/types'

export default defineEventHandler(async (event): Promise<PresenterCurrentState> => {
  await verifyAdmin(event)

  return await getPresenterCurrentState()
})
