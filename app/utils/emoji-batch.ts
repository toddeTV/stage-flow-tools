import type { EmojiReaction } from '~/types'

function isEmojiReaction(value: unknown): value is EmojiReaction {
  return typeof value === 'object'
    && value !== null
    && 'emoji' in value
    && typeof value.emoji === 'string'
    && value.emoji.length > 0
    && 'id' in value
    && typeof value.id === 'string'
    && value.id.length > 0
}

/** Returns valid emoji reactions from one server-side emoji batch event. */
export function getEmojiBatch(value: unknown): EmojiReaction[] {
  if (
    typeof value !== 'object'
    || value === null
    || !('event' in value)
    || value.event !== 'emojis'
    || !('data' in value)
    || !Array.isArray(value.data)
  ) {
    return []
  }

  return value.data.filter(isEmojiReaction)
}
