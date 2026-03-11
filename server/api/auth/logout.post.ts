export default defineEventHandler(async (event) => {
  // Clear the admin token by setting a cookie with a past expiration date
  setAdminCookie(event, '', 0)

  return { success: true }
})