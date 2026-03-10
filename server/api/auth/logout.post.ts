export default defineEventHandler(async (event) => {
  // Clear the admin token by setting a cookie with a past expiration date
  setCookie(event, 'admin_token', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0 // Expire the cookie immediately
  })

  return { success: true }
})