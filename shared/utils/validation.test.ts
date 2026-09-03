import { safeParse } from 'valibot'
import { describe, expect, it } from 'vite-plus/test'

import {
  EmptyRequestSchema,
  DeleteQuestionSchema,
  EmojiSubmitSchema,
  getValidationIssues,
  LoginRequestSchema,
  normalizeQuestionInput,
  QuestionInputValidationError,
  QuestionInputSchema,
  MoveQuestionSchema,
  StudioAssetPathSchema,
  WebSocketMessageSchema,
  WebSocketQuerySchema,
  ToggleQuestionDisabledSchema,
} from './validation'

describe('normalizeQuestionInput', () => {
  it('trims values and removes empty note locales', () => {
    expect(normalizeQuestionInput({
      key: ' sample-key ',
      question_text: {
        de: ' Hallo ',
        en: ' Hello ',
        fr: ' Bonjour ',
      },
      answer_options: [
        {
          emoji: ' 😀 ',
          text: {
            de: ' Ja ',
            en: ' Yes ',
            fr: ' Oui ',
          },
        },
        {
          text: {
            de: ' Nein ',
            en: ' No ',
          },
        },
      ],
      note: {
        de: ' ',
        en: ' Keep this ',
      },
    })).toEqual({
      key: 'sample-key',
      question_text: {
        de: 'Hallo',
        en: 'Hello',
        fr: 'Bonjour',
      },
      answer_options: [
        {
          emoji: '😀',
          text: {
            de: 'Ja',
            en: 'Yes',
            fr: 'Oui',
          },
        },
        {
          emoji: undefined,
          text: {
            de: 'Nein',
            en: 'No',
          },
        },
      ],
      note: {
        en: 'Keep this',
      },
    })
  })

  it('rejects missing english question text', () => {
    expect(() => normalizeQuestionInput({
      key: 'sample-key',
      question_text: {
        en: '   ',
      },
      answer_options: [
        { text: { en: 'One' } },
        { text: { en: 'Two' } },
      ],
    })).toThrowError(new QuestionInputValidationError([
      { code: 'validation.required', path: [
        'question_text',
      ] },
    ]))
  })

  it('rejects duplicate english answer labels after trim and lowercase normalization', () => {
    expect(() => normalizeQuestionInput({
      question_text: {
        en: 'Question',
      },
      answer_options: [
        { text: { en: ' Yes ' } },
        { text: { en: 'yes' } },
      ],
    })).toThrowError(new QuestionInputValidationError([
      { code: 'validation.duplicate_answer_option', path: [
        'answer_options',
      ] },
    ]))
  })

  it('rejects JSON-derived values that are not question objects', () => {
    const result = safeParse(QuestionInputSchema, [
      {
        question_text: { en: 'Question' },
      },
    ])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getValidationIssues(result.issues)).toEqual([
        { code: 'validation.invalid_type', path: [
          'question_text',
        ] },
        { code: 'validation.invalid_type', path: [
          'answer_options',
        ] },
      ])
    }
  })

  it('reports field paths for invalid nested option content', () => {
    const result = safeParse(QuestionInputSchema, {
      question_text: { en: 'Question' },
      answer_options: [
        { text: { en: 'One' } },
        { emoji: 'not an emoji', text: { en: 'Two' } },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getValidationIssues(result.issues)).toContainEqual({
        code: 'validation.invalid_emoji',
        path: [
          'answer_options',
          '1',
          'emoji',
        ],
      })
    }
  })

  it('rejects fewer than two answer options', () => {
    const result = safeParse(QuestionInputSchema, {
      question_text: { en: 'Question' },
      answer_options: [
        { text: { en: 'One' } },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getValidationIssues(result.issues)).toContainEqual({
        code: 'validation.minimum_answer_options',
        path: [
          'answer_options',
        ],
      })
    }
  })
})

describe('endpoint schemas', () => {
  it('preserves password whitespace while trimming the username', () => {
    expect(safeParse(LoginRequestSchema, {
      password: ' secret ',
      username: ' admin ',
    })).toMatchObject({
      output: {
        password: ' secret ',
        username: 'admin',
      },
      success: true,
    })

    expect(safeParse(LoginRequestSchema, {
      password: '',
      username: 'admin',
    }).success).toBe(false)
  })

  it('trims emoji request input and rejects malformed required values', () => {
    expect(safeParse(EmojiSubmitSchema, {
      emoji: ' 😀 ',
      user_id: ' participant ',
    })).toMatchObject({
      output: {
        emoji: '😀',
        user_id: 'participant',
      },
      success: true,
    })

    expect(safeParse(EmojiSubmitSchema, {
      emoji: '😀',
      user_id: ' ',
    }).success).toBe(false)
  })

  it('accepts only an empty body for no-body POST routes', () => {
    expect(safeParse(EmptyRequestSchema, undefined)).toMatchObject({ success: true })
    expect(safeParse(EmptyRequestSchema, {})).toMatchObject({ success: true })
    expect(safeParse(EmptyRequestSchema, { unexpected: true }).success).toBe(false)
  })

  it('validates question lifecycle mutation payloads', () => {
    expect(safeParse(DeleteQuestionSchema, { questionId: ' question-id ' })).toMatchObject({
      output: { questionId: 'question-id' },
      success: true,
    })
    expect(safeParse(ToggleQuestionDisabledSchema, { questionId: ' question-id ' })).toMatchObject({
      output: { questionId: 'question-id' },
      success: true,
    })
    expect(safeParse(MoveQuestionSchema, {
      direction: 'up',
      questionId: ' question-id ',
    })).toMatchObject({
      output: {
        direction: 'up',
        questionId: 'question-id',
      },
      success: true,
    })
    expect(safeParse(MoveQuestionSchema, {
      direction: 'sideways',
      questionId: 'question-id',
    }).success).toBe(false)
  })

  it('rejects Studio traversal paths', () => {
    expect(safeParse(StudioAssetPathSchema, 'assets/index.js')).toMatchObject({
      output: 'assets/index.js',
      success: true,
    })
    expect(safeParse(StudioAssetPathSchema, '../secrets').success).toBe(false)
    expect(safeParse(StudioAssetPathSchema, 'assets/../../secrets').success).toBe(false)
  })

  it('validates WebSocket query and message input', () => {
    expect(safeParse(WebSocketQuerySchema, {
      channel: 'results',
      userId: ' participant ',
    })).toMatchObject({
      output: {
        channel: 'results',
        userId: 'participant',
      },
      success: true,
    })
    expect(safeParse(WebSocketQuerySchema, { channel: 'other' }).success).toBe(false)
    expect(safeParse(WebSocketMessageSchema, 'ping')).toMatchObject({ success: true })
    expect(safeParse(WebSocketMessageSchema, 'pong').success).toBe(false)
  })
})
