import type { Question, AnswerOption } from '~/types'

export default defineEventHandler(async (event) => {
  verifyAdmin(event)

  const body = await readBody(event) as Omit<Question, 'id' | 'is_locked'>
  const { key: rawKey, question_text: raw_question_text, answer_options: raw_answer_options, note: raw_note } = body

  // Trim and validate key uniqueness
  const key = typeof rawKey === 'string' ? rawKey.trim() : undefined
  if (key) {
    const existingQuestions = await getQuestions()
    if (existingQuestions.some(q => q.key === key)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A question with this key already exists'
      })
    }
  }

  // Validate and sanitize question_text
  if (typeof raw_question_text?.en !== 'string' || !raw_question_text.en.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question text (English) is required'
    })
  }
  const question_text = Object.fromEntries(
    Object.entries(raw_question_text).map(([lang, value]) => [lang, String(value).trim()])
  )

  // Validate and sanitize answer_options
  if (!Array.isArray(raw_answer_options)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Answer options must be an array'
    })
  }

  const answer_options = raw_answer_options
    .map((option: AnswerOption) => ({
      text: typeof option.text?.en === 'string'
        ? Object.fromEntries(Object.entries(option.text).map(([lang, value]) => [lang, String(value).trim()]))
        : { en: '' },
      emoji: typeof option.emoji === 'string' ? option.emoji.trim() : undefined
    }))
    .filter(option => option.text.en)

  if (answer_options.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least 2 non-empty answer options are required'
    })
  }

  const note = (typeof raw_note?.en === 'string' && raw_note.en.trim())
    ? Object.fromEntries(
        Object.entries(raw_note).map(([lang, value]) => [lang, String(value).trim()])
      )
    : undefined

  const question = await createQuestion({
    key,
    question_text,
    answer_options,
    note
  })

  return question
})