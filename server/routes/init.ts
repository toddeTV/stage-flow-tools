import { verifyAdmin } from '../utils/auth'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  throwApiError(404, 'route.not_found')
})
