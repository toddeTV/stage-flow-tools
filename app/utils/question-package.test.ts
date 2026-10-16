import { describe, expect, it } from 'vite-plus/test'
import type { Question } from '~/types'
import {
  createQuestionPackage,
  getQuestionPackageImportPreview,
  stringifyQuestionPackage,
} from './question-package'

const commitSha = 'ab'.repeat(20)

function createQuestionFixture(overrides: Partial<Question> = {}): Question {
  return {
    answer_options: [
      { text: { en: 'Yes' } },
      { text: { en: 'No' } },
    ],
    alreadyPublished: true,
    createdAt: '2026-09-04T12:00:00.000Z',
    authoredAt: null,
    id: 'question-id',
    is_active: true,
    is_disabled: false,
    is_locked: true,
    key: 'question-key',
    note: { en: 'Note' },
    question_text: { en: 'Question' },
    sortOrder: 4,
    ...overrides,
  }
}

describe('question packages', () => {
  it('does not create an empty package that import would reject', () => {
    expect(() => createQuestionPackage([], commitSha)).toThrow('Question packages require at least one question')
  })

  it('exports only portable question configuration in existing queue order', () => {
    const packageValue = createQuestionPackage([
      createQuestionFixture({ key: 'first-question' }),
      createQuestionFixture({ id: 'second-id', key: 'second-question' }),
    ], commitSha)

    expect(packageValue).toEqual({
      format: 'stage-flow-tools.question-package',
      version: 1,
      commitSha,
      questions: [
        {
          answer_options: [
            { text: { en: 'Yes' } },
            { text: { en: 'No' } },
          ],
          is_disabled: false,
          key: 'first-question',
          note: { en: 'Note' },
          question_text: { en: 'Question' },
        },
        {
          answer_options: [
            { text: { en: 'Yes' } },
            { text: { en: 'No' } },
          ],
          is_disabled: false,
          key: 'second-question',
          note: { en: 'Note' },
          question_text: { en: 'Question' },
        },
      ],
    })
    expect(stringifyQuestionPackage(packageValue)).toContain('\n  "format"')
  })

  it('exports only known authored dates and preserves them through JSON', () => {
    const authoredAt = '2020-02-29T12:00:00.000Z'
    const exported = createQuestionPackage([
      createQuestionFixture({ authoredAt }),
      createQuestionFixture({ key: 'unknown' }),
    ], commitSha)
    const reparsed = JSON.parse(stringifyQuestionPackage(exported))
    expect(reparsed.questions[0].meta).toEqual({ authoredAt })
    expect(reparsed.questions[1]).not.toHaveProperty('meta')
    expect(reparsed.questions[0]).not.toHaveProperty('createdAt')
  })

  it('round-trips Markdown source and code-block line breaks', () => {
    const questionText = '**Question**\n\n```ts\nconst value = 1\n```'
    const answerText = '*Answer* with `code`'
    const packageValue = createQuestionPackage([
      createQuestionFixture({
        answer_options: [
          { text: { en: answerText } },
          { text: { en: 'Other' } },
        ],
        question_text: { en: questionText },
      }),
    ], commitSha)
    const reparsed = JSON.parse(stringifyQuestionPackage(packageValue))

    expect(reparsed.version).toBe(1)
    expect(reparsed.commitSha).toBe(commitSha)
    expect(reparsed.questions[0].question_text.en).toBe(questionText)
    expect(reparsed.questions[0].answer_options[0].text.en).toBe(answerText)
  })

  it('identifies package keys that conflict with existing questions', () => {
    const questions = [
      createQuestionFixture({ key: 'existing-question' }),
    ]
    const packageValue = {
      format: 'stage-flow-tools.question-package' as const,
      version: 1 as const,
      questions: [
        {
          answer_options: [
            { text: { en: 'Yes' } },
            { text: { en: 'No' } },
          ],
          is_disabled: false,
          key: 'existing-question',
          question_text: { en: 'Updated' },
        },
        {
          answer_options: [
            { text: { en: 'One' } },
            { text: { en: 'Two' } },
          ],
          is_disabled: false,
          question_text: { en: 'New without key' },
        },
      ],
    }

    expect(getQuestionPackageImportPreview(packageValue, questions)).toEqual({
      createCount: 1,
      conflictingKeys: [
        'existing-question',
      ],
    })
  })
})
