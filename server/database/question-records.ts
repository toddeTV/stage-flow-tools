import { createId } from '@paralleldrive/cuid2'
import type {
  Answer,
  AnswerOption,
  InputQuestion,
  LocalizedString,
  Question,
} from '../../app/types'
import type {
  AnswerRow,
  NewAnswerRow,
  QuestionRow,
} from './schema'

/**
 * Parses JSON from a text column and scopes failures to one field.
 * @param value Serialized JSON string from SQLite storage.
 * @param fieldName Field label used in thrown error text.
 * @returns Parsed typed value.
 */
function parseJson<T>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value) as T
  }
  catch {
    throw new Error(`Invalid JSON stored in ${fieldName}`)
  }
}

/**
 * Serializes a localized string for SQLite storage.
 * @param value Localized string value from app state.
 * @returns JSON string for the database row.
 */
export function serializeLocalizedString(value: LocalizedString): string {
  return JSON.stringify(value)
}

/**
 * Serializes answer options for SQLite storage.
 * @param value Answer options from a question model.
 * @returns JSON string for the database row.
 */
export function serializeAnswerOptions(value: AnswerOption[]): string {
  return JSON.stringify(value)
}

/**
 * Maps one stored question row into the app question shape.
 * @param row Question row returned from SQLite.
 * @returns Deserialized question object.
 */
export function deserializeQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    key: row.key,
    question_text: parseJson<LocalizedString>(row.questionText, `questions.question_text (id=${row.id})`),
    answer_options: parseJson<AnswerOption[]>(row.answerOptions, `questions.answer_options (id=${row.id})`),
    note: row.note ? parseJson<LocalizedString>(row.note, `questions.note (id=${row.id})`) : undefined,
    is_active: row.isActive,
    is_locked: row.isLocked,
    createdAt: row.createdAt,
    alreadyPublished: row.alreadyPublished,
  }
}

/**
 * Maps one stored answer row into the app answer shape.
 * @param row Answer row returned from SQLite.
 * @returns Deserialized answer object.
 */
export function deserializeAnswer(row: AnswerRow): Answer {
  return {
    id: row.id,
    question_id: row.questionId,
    user_id: row.userId,
    user_nickname: row.userNickname,
    selected_answer: parseJson<LocalizedString>(row.selectedAnswer, `answers.selected_answer (id=${row.id})`),
    timestamp: row.timestamp,
  }
}

/**
 * Builds a question row from input-question data and optional stored flags.
 * @param question Input question data from admin or seed flow.
 * @param options Optional stored values such as ids, flags, and timestamps.
 * @returns SQLite-ready question row.
 */
export function createQuestionInsert(
  question: InputQuestion,
  options: {
    alreadyPublished?: boolean
    createdAt?: string
    id?: string
    isActive?: boolean
    isLocked?: boolean
  } = {},
): QuestionRow {
  const id = options.id ?? createId()
  const key = question.key || id

  return {
    id,
    key,
    questionText: serializeLocalizedString(question.question_text),
    answerOptions: serializeAnswerOptions(question.answer_options),
    note: question.note ? serializeLocalizedString(question.note) : null,
    isActive: options.isActive ?? false,
    isLocked: options.isLocked ?? false,
    alreadyPublished: options.alreadyPublished ?? false,
    createdAt: options.createdAt ?? new Date().toISOString(),
  }
}

/**
 * Builds a stored question row for seeded question input.
 * @param question Seed question data.
 * @returns SQLite-ready seeded question row.
 */
export function createSeedQuestionInsert(question: InputQuestion): QuestionRow {
  return createQuestionInsert(question, { id: question.key || createId() })
}

/**
 * Builds a stored question row from an already materialized question.
 * @param question Existing question object from runtime storage.
 * @returns SQLite-ready stored question row.
 */
export function createStoredQuestionInsert(question: Question): QuestionRow {
  return {
    id: question.id,
    key: question.key,
    questionText: serializeLocalizedString(question.question_text),
    answerOptions: serializeAnswerOptions(question.answer_options),
    note: question.note ? serializeLocalizedString(question.note) : null,
    isActive: question.is_active ?? false,
    isLocked: question.is_locked,
    alreadyPublished: question.alreadyPublished,
    createdAt: question.createdAt,
  }
}

/**
 * Builds a stored answer row from runtime answer data.
 * @param answer Answer object with optional existing id.
 * @returns SQLite-ready answer row.
 */
export function createStoredAnswerInsert(answer: Omit<Answer, 'id'> & { id?: string }): NewAnswerRow {
  return {
    id: answer.id ?? createId(),
    questionId: answer.question_id,
    userId: answer.user_id,
    userNickname: answer.user_nickname,
    selectedAnswer: serializeLocalizedString(answer.selected_answer),
    timestamp: answer.timestamp,
  }
}
