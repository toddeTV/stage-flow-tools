export default defineEventHandler(async (event) => {
  // Clear the admin token by setting a cookie with a past expiration date
  setCookie(event, 'admin_token', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0 // Expire the cookie immediately
  })

  return { success: true }
})