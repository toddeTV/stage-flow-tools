export default defineEventHandler(async (event) => {
  const user = verifyAdmin(event)
  return { valid: true, user }
})