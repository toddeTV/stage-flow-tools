import { verifyAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
  })
})
