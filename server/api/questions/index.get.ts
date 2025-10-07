import type { Question } from '~/types'

export default defineEventHandler(async (event) => {
  // This endpoint is used by the admin page, so we need to verify the user is an admin.
  // For the public-facing page, a new endpoint should be created to only fetch the active question.
  verifyAdmin(event)
  return await getQuestions()
})