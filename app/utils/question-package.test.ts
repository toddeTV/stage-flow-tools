import { describe, expect, it } from 'vite-plus/test'
import type { Question } from '~/types'
import {
  createQuestionPackage,
  getQuestionPackageImportPreview,
  stringifyQuestionPackage,
} from './question-package'

function createQuestionFixture(overrides: Partial<Question> = {}): Question {
  return {
    answer_options: [
      { text: { en: 'Yes' } },
      { text: { en: 'No' } },
    ],
    alreadyPublished: true,
    createdAt: '2026-09-04T12:00:00.000Z',
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
    expect(() => createQuestionPackage([])).toThrow('Question packages require at least one question')
  })

  it('exports only portable question configuration in existing queue order', () => {
    const packageValue = createQuestionPackage([
      createQuestionFixture({ key: 'first-question' }),
      createQuestionFixture({ id: 'second-id', key: 'second-question' }),
    ])

    expect(packageValue).toEqual({
      format: 'stage-flow-tools.question-package',
      version: 1,
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

  it('counts package keys that will update existing questions', () => {
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
      updateCount: 1,
    })
  })
})
