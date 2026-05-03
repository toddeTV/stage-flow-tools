import { createId } from '@paralleldrive/cuid2'
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const nowIsoExpression = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

/**
 * Persistent quiz question table.
 *
 * Localized question text, answer options, and optional notes are stored as
 * serialized JSON to keep the runtime contract aligned with `app/types.ts`.
 */
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  key: text('key').notNull(),
  questionText: text('question_text').notNull(),
  answerOptions: text('answer_options').notNull(),
  note: text('note'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  alreadyPublished: integer('already_published', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(nowIsoExpression),
}, table => [
  uniqueIndex('questions_key_unique').on(table.key),
  index('questions_active_idx').on(table.isActive),
  index('questions_created_at_idx').on(table.createdAt),
])

/**
 * Persistent quiz answers table.
 *
 * One user can answer one question once. Re-submission updates the same row.
 */
export const answers = sqliteTable('answers', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  userNickname: text('user_nickname').notNull(),
  selectedAnswer: text('selected_answer').notNull(),
  timestamp: text('timestamp').notNull().default(nowIsoExpression),
}, table => [
  uniqueIndex('answers_question_user_unique').on(table.questionId, table.userId),
  index('answers_question_idx').on(table.questionId),
  index('answers_user_idx').on(table.userId),
])

export type QuestionRow = typeof questions.$inferSelect
export type NewQuestionRow = typeof questions.$inferInsert
export type AnswerRow = typeof answers.$inferSelect
export type NewAnswerRow = typeof answers.$inferInsert
