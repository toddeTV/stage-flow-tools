import { getCurrentResults } from '../../utils/storage'

export default defineEventHandler(async () => {
  const results = await getCurrentResults()
  return results || { message: 'No active question' }
})