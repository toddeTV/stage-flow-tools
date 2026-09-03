import { createId } from '@paralleldrive/cuid2'
import { WebSocketChannel } from '~/types'
import { EmojiSubmitSchema } from '#shared/utils/validation'

export default defineApiHandler(async (event) => {
  const { emoji, user_id } = await readValidatedRequestBody<{
    emoji: string
    user_id: string
  }>(event, EmojiSubmitSchema)

  if (checkEmojiCooldown(user_id)) {
    throwApiError(429, 'emoji.cooldown')
  }

  updateEmojiTimestamp(user_id)

  // Broadcast the emoji with a unique ID to ensure reactivity on the client
  broadcast('emoji', { emoji, id: createId() }, WebSocketChannel.EMOJIS)

  return {
    statusCode: 200,
    body: { message: 'Emoji received and broadcasted.' },
  }
})
