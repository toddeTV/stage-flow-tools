export default defineEventHandler(async (event) => {
  const user = await verifyAdmin(event)
  return { valid: true, user }
})
