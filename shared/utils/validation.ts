import * as v from 'valibot'
import type {
  InputQuestion,
} from '../../app/types'
import type { ApiErrorCode, ApiErrorIssue } from './api-errors'
import { isApiErrorCode } from './api-errors'

const trimmedStringSchema = v.pipe(
  v.string('validation.invalid_type'),
  v.trim(),
)

const requiredTrimmedStringSchema = v.pipe(
  trimmedStringSchema,
  v.minLength(1, 'validation.required'),
)

const localizedStringSchema = v.pipe(
  v.record(v.string(), trimmedStringSchema),
  v.check(value => Boolean(value.en), 'validation.required'),
)

const optionalLocalizedStringSchema = v.pipe(
  v.optional(v.record(v.string(), trimmedStringSchema)),
  v.transform((value) => {
    if (!value) {
      return undefined
    }

    const populatedValues = Object.entries(value).filter(([
      ,
      localizedValue,
    ]) => localizedValue.length > 0)

    return populatedValues.length > 0
      ? Object.fromEntries(populatedValues)
      : undefined
  }),
)

const optionalEmojiSchema = v.pipe(
  v.optional(trimmedStringSchema),
  v.transform(value => value || undefined),
  v.check(value => value === undefined || isValidEmoji(value), 'validation.invalid_emoji'),
)

const questionInputEntries = {
  key: v.optional(trimmedStringSchema, ''),
  question_text: localizedStringSchema,
  answer_options: v.array(v.object({
    emoji: optionalEmojiSchema,
    text: localizedStringSchema,
  }), 'validation.invalid_type'),
  note: optionalLocalizedStringSchema,
}

export const QuestionInputSchema = v.pipe(
  v.object(questionInputEntries, 'validation.invalid_type'),
  v.forward(
    v.check(value => value.answer_options.length >= 2, 'validation.minimum_answer_options'),
    [
      'answer_options',
    ],
  ),
  v.forward(
    v.check((value) => {
      const normalizedLabels = new Set<string>()

      for (const option of value.answer_options) {
        const englishLabel = option.text.en

        if (!englishLabel) {
          return false
        }

        const normalizedLabel = englishLabel.toLowerCase()

        if (normalizedLabels.has(normalizedLabel)) {
          return false
        }

        normalizedLabels.add(normalizedLabel)
      }

      return true
    }, 'validation.duplicate_answer_option'),
    [
      'answer_options',
    ],
  ),
)

export const QuestionUpdateSchema = v.object({
  questionId: requiredTrimmedStringSchema,
  ...questionInputEntries,
}, 'validation.invalid_type')

export const LoginRequestSchema = v.object({
  password: v.pipe(
    v.string('validation.invalid_type'),
    v.minLength(1, 'validation.required'),
  ),
  username: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const NicknameSchema = requiredTrimmedStringSchema

export const EmojiSchema = v.pipe(
  requiredTrimmedStringSchema,
  v.check(isValidEmoji, 'validation.invalid_emoji'),
)

export const AnswerSubmitSchema = v.object({
  selected_answer: localizedStringSchema,
  user_id: requiredTrimmedStringSchema,
  user_nickname: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const AnswerRetractSchema = v.object({
  question_id: requiredTrimmedStringSchema,
  user_id: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const EmojiSubmitSchema = v.object({
  emoji: EmojiSchema,
  user_id: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const PublishQuestionSchema = v.object({
  key: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const ToggleQuestionLockSchema = v.object({
  questionId: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const ToggleQuestionDisabledSchema = v.object({
  questionId: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const DeleteQuestionSchema = v.object({
  questionId: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const MoveQuestionSchema = v.object({
  direction: v.picklist([
    'up',
    'down',
  ]),
  questionId: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const PickRandomUserSchema = v.object({
  option: requiredTrimmedStringSchema,
  questionId: requiredTrimmedStringSchema,
}, 'validation.invalid_type')

export const EmptyRequestSchema = v.optional(v.strictObject({}), undefined)

export const StudioAssetPathSchema = v.pipe(
  requiredTrimmedStringSchema,
  v.check(
    value => value.split('/').every(segment => segment !== '.' && segment !== '..'),
    'studio.asset_path_invalid',
  ),
)

export const WebSocketQuerySchema = v.object({
  channel: v.optional(v.picklist([
    'default',
    'results',
    'emojis',
  ]), 'default'),
  userId: v.pipe(
    v.optional(trimmedStringSchema),
    v.transform(value => value || undefined),
  ),
}, 'validation.invalid_websocket_query')

export const WebSocketMessageSchema = v.literal('ping', 'validation.invalid_websocket_message')

export class QuestionInputValidationError extends Error {
  readonly issues: ApiErrorIssue[]

  constructor(issues: ApiErrorIssue[]) {
    super(issues[0]?.code || 'validation.invalid_request')
    this.name = 'QuestionInputValidationError'
    this.issues = issues
  }
}

function getIssueCode(message: string | undefined): ApiErrorCode {
  if (isApiErrorCode(message) && message.startsWith('validation.')) {
    return message
  }

  return 'validation.invalid_request'
}

export function getValidationIssues(issues: readonly v.BaseIssue<unknown>[]): ApiErrorIssue[] {
  return issues.map(issue => ({
    code: getIssueCode(issue.message),
    path: issue.path?.map(pathItem => String(pathItem.key)) ?? [],
  }))
}

export function normalizeQuestionInput(value: unknown): InputQuestion {
  const result = v.safeParse(QuestionInputSchema, value)

  if (!result.success) {
    throw new QuestionInputValidationError(getValidationIssues(result.issues))
  }

  return result.output as InputQuestion
}

export function normalizeQuestionUpdateInput(value: unknown): InputQuestion & { questionId: string } {
  const result = v.safeParse(QuestionUpdateSchema, value)

  if (!result.success) {
    throw new QuestionInputValidationError(getValidationIssues(result.issues))
  }

  return result.output as InputQuestion & { questionId: string }
}

/** Validates if the input string is a single emoji. */
export function isValidEmoji(emoji: string): boolean {
  if (!emoji || typeof emoji !== 'string') {
    return false
  }

  const emojiRegex
    = /^(?:\p{Emoji}|\u200D|\uFE0F|\uFE0E|[\u{E0020}-\u{E007F}]|[\u2600-\u26FF]|[\u2700-\u27BF])+$/u

  return [
    ...new Intl.Segmenter().segment(emoji),
  ].length === 1 && emojiRegex.test(emoji)
}
