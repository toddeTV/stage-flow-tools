export default defineEventHandler(async (event) => {
  // Clear the admin token by setting a cookie with a past expiration date
  const isSecure = getRequestProtocol(event) === 'https'

  setCookie(event, 'admin_token', '', {
    httpOnly: true,
    path: '/',
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    maxAge: 0 // Expire the cookie immediately
  })

  return { success: true }
})