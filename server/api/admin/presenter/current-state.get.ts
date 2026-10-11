import type { PresenterCurrentState } from '~/types'
import { PresenterQuestionQuerySchema } from '#shared/utils/validation'

export default defineApiHandler(async (event): Promise<PresenterCurrentState> => {
  await verifyAdmin(event)

  const { key } = parseValidatedValue<{ key?: string }>(getQuery(event), PresenterQuestionQuerySchema)
  return await getPresenterCurrentState(key)
})
