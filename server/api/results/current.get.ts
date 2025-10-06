import type { Results } from '~/types'

export default defineEventHandler(async (): Promise<Results | { message: string }> => {
  const results = await getCurrentResults()
  return results || { message: 'No active question' }
})