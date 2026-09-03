import { EmptyRequestSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  await readValidatedRequestBody(event, EmptyRequestSchema)

  // Clear the admin token by setting a cookie with a past expiration date
  setAdminCookie(event, '', 0)

  return { success: true }
})
