import type { PresenterCurrentState } from '~/types'

export default defineApiHandler(async (event): Promise<PresenterCurrentState> => {
  await verifyAdmin(event)

  return await getPresenterCurrentState()
})
