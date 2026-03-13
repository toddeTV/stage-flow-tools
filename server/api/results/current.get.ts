import type { Results } from '~/types'

export default defineEventHandler(async (event): Promise<Results | { message: string }> => {
  await verifyAdmin(event)
  const { totalConnections } = await getConnections(event)
  const results = await getCurrentResults(totalConnections)
  return results || { message: 'No active question' }
})
