import { getActiveQuestion } from '../../utils/storage'

export default defineEventHandler(async () => {
  const question = await getActiveQuestion()
  return question || { message: 'No active question' }
})