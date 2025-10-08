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
  // This regex is more inclusive and covers a wider range of characters that render as emojis,
  // including symbols, pictographs, and transport/map symbols.
  const emojiRegex = /^(?:\p{Emoji}|[\u200D\uFE0F\uFE0E\uDB40-\uDB7F]|[\u2600-\u26FF]|[\u2700-\u27BF])+$/u

  // Check if the string is a single grapheme cluster and matches the broader emoji pattern.
  // This ensures complex emojis (like flags or family emojis) are counted as one.
  return [...new Intl.Segmenter().segment(emoji)].length === 1 && emojiRegex.test(emoji)
}