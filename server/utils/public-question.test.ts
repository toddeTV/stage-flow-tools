import { describe, expect, it } from 'vite-plus/test'
import type { Question } from '~/types'
import { serializePublicQuestion } from './public-question'

const question: Question = {
  alreadyPublished: true,
  answer_options: [
    { emoji: '⭐', text: { en: 'Correct' } },
    { emoji: '❌', text: { en: 'Incorrect' } },
  ],
  createdAt: '2026-09-03T00:00:00.000Z',
  id: 'question-id',
  is_active: true,
  is_disabled: true,
  is_locked: false,
  key: 'admin-only-key',
  note: { en: 'Admin-only note' },
  question_text: { en: 'Question text' },
  sortOrder: 3,
}

describe('serializePublicQuestion', () => {
  it('removes admin-only fields and answer-option emoji', () => {
    expect(serializePublicQuestion(question)).toEqual({
      answer_options: [
        { text: { en: 'Correct' } },
        { text: { en: 'Incorrect' } },
      ],
      createdAt: '2026-09-03T00:00:00.000Z',
      id: 'question-id',
      is_active: true,
      is_locked: false,
      question_text: { en: 'Question text' },
    })
  })
})
