export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { emoji } = body

  if (!isValidEmoji(emoji)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid emoji provided. Please provide a single emoji.',
    })
  }

  // Broadcast the emoji to all connected clients
  broadcast('emoji', { emoji }, 'emojis')

  return {
    statusCode: 200,
    body: { message: 'Emoji received and broadcasted.' },
  }
})