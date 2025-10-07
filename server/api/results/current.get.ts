import type { Results } from '~/types'

export default defineEventHandler(async (event): Promise<Results | { message: string }> => {
  verifyAdmin(event)
  const results = await getCurrentResults()
  return results || { message: 'No active question' }
})