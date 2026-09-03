export default defineApiHandler(async (event) => {
  const user = await verifyAdmin(event)
  syncAdminCookieFromHeaderToken(event)
  return { valid: true, user }
})
