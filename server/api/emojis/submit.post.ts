import { createId } from '@paralleldrive/cuid2'
import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { emoji, user_id } = body

  if (!user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required.',
    })
  }

  if (checkEmojiCooldown(user_id)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'You are sending emojis too fast. Please wait a moment.',
    })
  }

  if (!isValidEmoji(emoji)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid emoji provided. Please provide a single emoji.',
    })
  }

  updateEmojiTimestamp(user_id)

  // Broadcast the emoji with a unique ID to ensure reactivity on the client
  broadcast('emoji', { emoji, id: createId() }, WebSocketChannel.EMOJIS)

  return {
    statusCode: 200,
    body: { message: 'Emoji received and broadcasted.' },
  }
})
