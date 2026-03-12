import type { Question, AnswerOption, LocalizedString } from '~/types'

export default defineEventHandler(async (event) => {
  verifyAdmin(event)

  const body = await readBody(event) as Omit<Question, 'id' | 'is_locked'>
  const { key: rawKey, question_text: raw_question_text, answer_options: raw_answer_options, note: raw_note } = body

  // Trim and validate key uniqueness
  const key = typeof rawKey === 'string' ? rawKey.trim() : ''
  if (key) {
    const existingQuestions = await getQuestions()
    if (existingQuestions.some(q => q.key === key)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A question with this key already exists',
      })
    }
  }

  // Validate and sanitize question_text
  if (typeof raw_question_text?.en !== 'string' || !raw_question_text.en.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question text (English) is required',
    })
  }
  // Validate all locale values are strings
  for (const [lang, value] of Object.entries(raw_question_text)) {
    if (typeof value !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid value for locale "${lang}" in question_text: expected string`,
      })
    }
  }
  const question_text = Object.fromEntries(
    Object.entries(raw_question_text).map(([lang, value]) => [lang, (value as string).trim()]),
  ) as LocalizedString

  // Validate and sanitize answer_options
  if (!Array.isArray(raw_answer_options)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Answer options must be an array',
    })
  }

  const answer_options = raw_answer_options
    .map((option: AnswerOption) => {
      if (typeof option.text?.en !== 'string' || !option.text.en.trim()) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Each answer option must have a non-empty English text',
        })
      }
      for (const [lang, value] of Object.entries(option.text)) {
        if (typeof value !== 'string') {
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid value for locale "${lang}" in answer option text: expected string`,
          })
        }
      }
      return {
        text: Object.fromEntries(Object.entries(option.text).map(([lang, value]) => [lang, (value as string).trim()])) as LocalizedString,
        emoji: typeof option.emoji === 'string' ? option.emoji.trim() : undefined,
      }
    })

  if (answer_options.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least 2 non-empty answer options are required',
    })
  }

  let note: LocalizedString | undefined
  if (typeof raw_note === 'object' && raw_note !== null && !Array.isArray(raw_note)) {
    const validNotes: Record<string, string> & { en?: string } = {}
    for (const [lang, value] of Object.entries(raw_note)) {
      if (typeof value !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid value for locale "${lang}" in note: expected string`,
        })
      }
      const trimmed = value.trim()
      if (trimmed) {
        validNotes[lang] = trimmed
      }
    }
    if (Object.keys(validNotes).length > 0) {
      note = validNotes as LocalizedString
    }
  }

  let question
  try {
    question = await createQuestion({
      key,
      question_text,
      answer_options,
      note,
    })
  }
  catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A question with this key already exists',
      })
    }
    throw error
  }

  return question
})
