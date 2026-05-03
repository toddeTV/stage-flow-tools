import type {
  AnswerOption,
  InputQuestion,
  LocalizedString,
} from '../../app/types'

export class QuestionInputValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuestionInputValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function throwQuestionInputValidationError(message: string): never {
  throw new QuestionInputValidationError(message)
}

function normalizeLocalizedString(
  value: unknown,
  fieldName: string,
  options: { requireEnglishValue: boolean } = { requireEnglishValue: false },
): LocalizedString {
  if (!isRecord(value)) {
    throwQuestionInputValidationError(`${fieldName} must be an object`)
  }

  const normalizedValue: Record<string, string> = {}

  for (const [
    lang,
    localizedValue,
  ] of Object.entries(value)) {
    if (typeof localizedValue !== 'string') {
      throwQuestionInputValidationError(`Invalid value for locale "${lang}" in ${fieldName}: expected string`)
    }

    normalizedValue[lang] = localizedValue.trim()
  }

  if (options.requireEnglishValue && !normalizedValue.en) {
    throwQuestionInputValidationError(`${fieldName} (English) is required`)
  }

  return normalizedValue as LocalizedString
}

function normalizeOptionalLocalizedString(value: unknown, fieldName: string): LocalizedString | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const normalizedValue: Record<string, string> = {}

  for (const [
    lang,
    localizedValue,
  ] of Object.entries(value)) {
    if (typeof localizedValue !== 'string') {
      throwQuestionInputValidationError(`Invalid value for locale "${lang}" in ${fieldName}: expected string`)
    }

    const trimmedValue = localizedValue.trim()
    if (trimmedValue) {
      normalizedValue[lang] = trimmedValue
    }
  }

  return Object.keys(normalizedValue).length > 0
    ? normalizedValue as LocalizedString
    : undefined
}

function normalizeAnswerOptions(value: unknown): AnswerOption[] {
  if (!Array.isArray(value)) {
    throwQuestionInputValidationError('Answer options must be an array')
  }

  if (value.length < 2) {
    throwQuestionInputValidationError('At least 2 non-empty answer options are required')
  }

  const answerOptions = value.map((rawOption) => {
    if (!isRecord(rawOption)) {
      throwQuestionInputValidationError('Each answer option must be an object')
    }

    return {
      text: normalizeLocalizedString(rawOption.text, 'answer option text', { requireEnglishValue: true }),
      emoji: typeof rawOption.emoji === 'string' ? rawOption.emoji.trim() || undefined : undefined,
    } satisfies AnswerOption
  })

  const normalizedEnglishLabels = new Set<string>()

  for (const option of answerOptions) {
    const normalizedEnglishLabel = option.text.en.toLowerCase()

    if (normalizedEnglishLabels.has(normalizedEnglishLabel)) {
      throwQuestionInputValidationError('Answer option English text values must be unique')
    }

    normalizedEnglishLabels.add(normalizedEnglishLabel)
  }

  return answerOptions
}

/**
 * Normalizes and validates admin question input so create and update share one rule set.
 */
export function normalizeQuestionInput(value: unknown): InputQuestion {
  if (!isRecord(value)) {
    throwQuestionInputValidationError('Question payload must be an object')
  }

  const key = typeof value.key === 'string' ? value.key.trim() : ''

  return {
    key,
    question_text: normalizeLocalizedString(value.question_text, 'Question text', { requireEnglishValue: true }),
    answer_options: normalizeAnswerOptions(value.answer_options),
    note: normalizeOptionalLocalizedString(value.note, 'note'),
  }
}

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
  const emojiRegex
    = /^(?:\p{Emoji}|\u200D|\uFE0F|\uFE0E|[\u{E0020}-\u{E007F}]|[\u2600-\u26FF]|[\u2700-\u27BF])+$/u

  // Check if the string is a single grapheme cluster and matches the broader emoji pattern.
  // This ensures complex emojis (like flags or family emojis) are counted as one.
  return [
    ...new Intl.Segmenter().segment(emoji),
  ].length === 1 && emojiRegex.test(emoji)
}
