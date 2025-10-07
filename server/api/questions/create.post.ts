import type { Question, AnswerOption } from '~/types'

export default defineEventHandler(async (event) => {
  verifyAdmin(event)

  const body = await readBody(event) as Omit<Question, 'id' | 'is_locked'>
  const { question_text: raw_question_text, answer_options: raw_answer_options, note: raw_note } = body

  // Validate and sanitize question_text
  const question_text = typeof raw_question_text === 'string' ? raw_question_text.trim() : ''
  if (!question_text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question text is required'
    })
  }

  // Validate and sanitize answer_options
  if (!Array.isArray(raw_answer_options)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Answer options must be an array'
    })
  }

  const answer_options = raw_answer_options
    .map((option: AnswerOption) => ({
      text: typeof option.text === 'string' ? option.text.trim() : '',
      emoji: typeof option.emoji === 'string' ? option.emoji.trim() : undefined
    }))
    .filter(option => option.text)

  if (answer_options.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least 2 non-empty answer options are required'
    })
  }

  const note = typeof raw_note === 'string' ? raw_note.trim() : undefined

  const question = await createQuestion({
    question_text,
    answer_options,
    note
  })

  return question
})