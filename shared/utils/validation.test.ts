import { safeParse } from 'valibot'
import { describe, expect, it } from 'vite-plus/test'

import {
  AnswerSubmitSchema,
  EmptyRequestSchema,
  DeleteQuestionSchema,
  EmojiSubmitSchema,
  getValidationIssues,
  LoginRequestSchema,
  normalizeQuestionInput,
  normalizeQuestionPackage,
  QuestionInputValidationError,
  QuestionInputSchema,
  QuestionPackageSchema,
  QuestionUpdateSchema,
  MoveQuestionSchema,
  StudioAssetPathSchema,
  WebSocketMessageSchema,
  WebSocketQuerySchema,
  ToggleQuestionDisabledSchema,
} from './validation'

describe('AnswerSubmitSchema', () => {
  it('requires and trims the question ID alongside the answer', () => {
    const body = { selected_answer: { en: 'One' }, user_id: 'participant-id', user_nickname: 'Participant' }
    for (const question_id of [
      undefined,
      '',
      '   ',
    ]) {
      expect(safeParse(AnswerSubmitSchema, { ...body, question_id }).success).toBe(false)
    }
    const result = safeParse(AnswerSubmitSchema, { ...body, question_id: ' question-id ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.output.question_id).toBe('question-id')
  })
})

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
  it.each([
    { labels: [], code: 'validation.minimum_answer_options' },
    { labels: [
      'One',
    ], code: 'validation.minimum_answer_options' },
    { labels: [
      'One',
      'One',
    ], code: 'validation.duplicate_answer_option' },
    { labels: [
      'One',
      'oNe',
    ], code: 'validation.duplicate_answer_option' },
    { labels: [
      ' One ',
      'one ',
    ], code: 'validation.duplicate_answer_option' },
  ])('rejects invalid options across create, update and package schemas: $labels', ({ labels, code }) => {
    const question = {
      answer_options: labels.map(en => ({ text: { en } })),
      question_text: { en: 'Question' },
    }
    const cases = [
      { result: safeParse(QuestionInputSchema, question), path: [
        'answer_options',
      ] },
      {
        result: safeParse(QuestionUpdateSchema, { ...question, questionId: 'question-id', resetAnswers: true }),
        path: [
          'answer_options',
        ],
      },
      {
        result: safeParse(QuestionPackageSchema, {
          format: 'stage-flow-tools.question-package',
          version: 2,
          questions: [
            { ...question, is_disabled: false },
          ],
        }),
        path: [
          'questions',
          '0',
          'answer_options',
        ],
      },
    ]

    for (const { result, path } of cases) {
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getValidationIssues(result.issues)).toContainEqual({ code, path })
      }
    }
  })

  it.each([
    { option: { emoji: 'not an emoji', text: { en: 'Two' } }, field: 'emoji', code: 'validation.invalid_emoji' },
    { option: { text: { de: 'Zwei' } }, field: 'text', code: 'validation.required' },
    { option: { text: { en: '   ' } }, field: 'text', code: 'validation.required' },
  ])('retains nested option issue paths on updates and package imports: $code $option', ({ option, field, code }) => {
    const question = {
      answer_options: [
        { text: { en: 'One' } },
        option,
      ],
      question_text: { en: 'Question' },
    }
    const cases = [
      {
        result: safeParse(QuestionUpdateSchema, { ...question, questionId: 'question-id' }),
        path: [
          'answer_options',
          '1',
          field,
        ],
      },
      {
        result: safeParse(QuestionPackageSchema, {
          format: 'stage-flow-tools.question-package',
          version: 2,
          questions: [
            { ...question, is_disabled: false },
          ],
        }),
        path: [
          'questions',
          '0',
          'answer_options',
          '1',
          field,
        ],
      },
    ]

    for (const { result, path } of cases) {
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getValidationIssues(result.issues)).toContainEqual({ code, path })
      }
    }
  })

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

  it('defaults answer resets to false on question updates', () => {
    expect(safeParse(QuestionUpdateSchema, {
      ...{
        answer_options: [
          { text: { en: 'One' } },
          { text: { en: 'Two' } },
        ],
        question_text: { en: 'Question' },
      },
      questionId: ' question-id ',
    })).toMatchObject({
      output: expect.objectContaining({
        questionId: 'question-id',
        resetAnswers: false,
      }),
      success: true,
    })

    expect(safeParse(QuestionUpdateSchema, {
      answer_options: [
        { text: { en: 'One' } },
        { text: { en: 'Two' } },
      ],
      questionId: 'question-id',
      question_text: { en: 'Question' },
      resetAnswers: 'yes',
    }).success).toBe(false)
  })

  it('validates strict Version 2 question packages', () => {
    expect(normalizeQuestionPackage({
      format: 'stage-flow-tools.question-package',
      version: 2,
      questions: [
        {
          answer_options: [
            { text: { en: 'One' } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false,
          question_text: { en: 'Question' },
        },
      ],
    })).toEqual({
      format: 'stage-flow-tools.question-package',
      version: 2,
      questions: [
        {
          answer_options: [
            { emoji: undefined, text: { en: 'One' } },
            { emoji: undefined, text: { en: 'Two' } },
          ],
          is_disabled: false,
          key: '',
          note: undefined,
          question_text: { en: 'Question' },
        },
      ],
    })
  })

  it.each([
    [
      undefined,
      undefined,
    ],
    [
      '2024-02-29T12:30:45Z',
      '2024-02-29T12:30:45.000Z',
    ],
    [
      '2024-02-29T12:30:45.12Z',
      '2024-02-29T12:30:45.120Z',
    ],
  ])('accepts optional UTC authoredAt directly on a question: %s', (authoredAt, expected) => {
    const result = normalizeQuestionPackage({
      format: 'stage-flow-tools.question-package', version: 2,
      questions: [
        {
          question_text: { en: 'Question' },
          answer_options: [
            { text: { en: 'One' } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false,
          ...(authoredAt === undefined ? {} : { authoredAt }),
        },
      ],
    })
    expect(result.questions[0]?.authoredAt).toBe(expected)
    expect(result.questions[0]).not.toHaveProperty('meta')
  })

  it.each([
    { meta: {} },
    { meta: { authoredAt: '2024-02-29T12:30:45Z' } },
    { authoredAt: '2024-02-29T12:30:45Z', meta: { authoredAt: '2024-02-29T12:30:45Z' } },
  ])('rejects removed meta fields: %j', (fields) => {
    const result = safeParse(QuestionPackageSchema, {
      format: 'stage-flow-tools.question-package', version: 2,
      questions: [
        {
          question_text: { en: 'Question' },
          answer_options: [
            { text: { en: 'One' } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false,
          ...fields,
        },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getValidationIssues(result.issues)).toContainEqual({
        code: 'validation.invalid_question_package', path: [
          'questions',
          '0',
          'meta',
        ],
      })
    }
  })

  it.each([
    '2023-02-29T12:30:45Z',
    '2024-02-30T12:30:45Z',
    '2024-13-01T12:30:45Z',
    '2024-01-01T24:00:00Z',
    '2024-01-01',
    '2024-01-01T12:30:45',
    '2024-01-01T12:30:45+00:00',
    '2024-01-01T12:30:45+02:00',
    '2024-01-01T12:30:45.1234Z',
    '',
    null,
    123,
  ])('rejects malformed author timestamps with their field path: %s', (authoredAt) => {
    const result = safeParse(QuestionPackageSchema, {
      format: 'stage-flow-tools.question-package', version: 2,
      questions: [
        {
          question_text: { en: 'Question' },
          answer_options: [
            { text: { en: 'One' } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false, authoredAt,
        },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(getValidationIssues(result.issues)[0]?.path).toEqual([
        'questions',
        '0',
        'authoredAt',
      ])
    }
  })

  it('preserves Markdown and internal line breaks in Version 2 question packages', () => {
    const questionText = [
      '**What does this return?**',
      '',
      '```ts',
      'const value = 1',
      'return value',
      '```',
    ].join('\n')
    const answerText = '*One* with `number`'
    const questionPackage = normalizeQuestionPackage({
      format: 'stage-flow-tools.question-package',
      version: 2,
      questions: [
        {
          answer_options: [
            { text: { en: answerText } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false,
          question_text: { en: questionText },
        },
      ],
    })

    expect(questionPackage.version).toBe(2)
    expect(questionPackage.questions[0]?.question_text.en).toBe(questionText)
    expect(questionPackage.questions[0]?.answer_options[0]?.text.en).toBe(answerText)
  })

  it('rejects unsupported packages and duplicate populated keys', () => {
    const basePackage = {
      format: 'stage-flow-tools.question-package',
      version: 2,
      questions: [
        {
          answer_options: [
            { text: { en: 'One' } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false,
          key: 'question-key',
          question_text: { en: 'Question' },
        },
      ],
    }

    expect(safeParse(QuestionPackageSchema, {
      ...basePackage,
      version: 1,
    }).success).toBe(false)
    expect(safeParse(QuestionPackageSchema, {
      ...basePackage,
      questions: [
        ...basePackage.questions,
        {
          ...basePackage.questions[0],
          question_text: { en: 'Other question' },
        },
      ],
    }).success).toBe(false)
    expect(safeParse(QuestionPackageSchema, {
      ...basePackage,
      unexpected: true,
    }).success).toBe(false)
    expect(safeParse(QuestionPackageSchema, {
      ...basePackage,
      questions: [
        {
          ...basePackage.questions[0],
          answer_options: [
            { text: { en: 'Only one' } },
          ],
        },
      ],
    }).success).toBe(false)
  })

  it('accepts only the current numeric format version, independently of commit metadata', () => {
    const basePackage = {
      format: 'stage-flow-tools.question-package',
      questions: [
        {
          question_text: { en: 'Question' },
          answer_options: [
            { text: { en: 'One' } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false,
        },
      ],
      commitSha: 'ab'.repeat(20),
    }
    for (const version of [
      0,
      1,
      3,
      -1,
      '2',
      '1.1.0',
      undefined,
      null,
    ]) {
      const result = safeParse(QuestionPackageSchema, { ...basePackage, version })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(getValidationIssues(result.issues)).toContainEqual({
          code: 'validation.unsupported_question_package_version', path: [
            'version',
          ],
        })
      }
    }
    expect(safeParse(QuestionPackageSchema, basePackage).success).toBe(false)
    expect(normalizeQuestionPackage({ ...basePackage, version: 2, commitSha: 'AB'.repeat(20) }).commitSha)
      .toBe('ab'.repeat(20))
    for (const commitSha of [
      '',
      'abcdef0',
      'z'.repeat(40),
      null,
      123,
    ]) {
      expect(safeParse(QuestionPackageSchema, { ...basePackage, version: 2, commitSha }).success).toBe(false)
    }
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
