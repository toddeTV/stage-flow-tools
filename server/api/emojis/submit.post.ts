import { createId } from '@paralleldrive/cuid2'
import { WebSocketChannel } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { emoji } = body

  if (!isValidEmoji(emoji)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid emoji provided. Please provide a single emoji.',
    })
  }

  // Broadcast the emoji with a unique ID to ensure reactivity on the client
  broadcast('emoji', { emoji, id: createId() }, WebSocketChannel.EMOJIS)

  return {
    statusCode: 200,
    body: { message: 'Emoji received and broadcasted.' },
  }
})