/**
 * Validates if the input string is a single emoji.
 *
 * @param emoji - The string to validate.
 * @returns True if the string is a single emoji, false otherwise.
 */
export function isValidEmoji(emoji: string): boolean {
  if (!emoji || typeof emoji !== 'string') {
    return false
  }

  // Regex to match most common emojis, including ZWJ sequences and skin tone modifiers
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Component}|\p{Extended_Pictographic})(?:\u{200D}(?:\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Component}|\p{Extended_Pictographic}))*$/u

  // Check if the string is a single grapheme cluster and matches the emoji pattern
  return [...new Intl.Segmenter().segment(emoji)].length === 1 && emojiRegex.test(emoji)
}