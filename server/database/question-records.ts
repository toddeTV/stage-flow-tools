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

function parseJson<T>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value) as T
  }
  catch {
    throw new Error(`Invalid JSON stored in ${fieldName}`)
  }
}

export function serializeLocalizedString(value: LocalizedString): string {
  return JSON.stringify(value)
}

export function serializeAnswerOptions(value: AnswerOption[]): string {
  return JSON.stringify(value)
}

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

export function createSeedQuestionInsert(question: InputQuestion): QuestionRow {
  return createQuestionInsert(question, { id: question.key || createId() })
}

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
