import { describe, expect, it } from 'vite-plus/test'

import {
  normalizeQuestionInput,
  QuestionInputValidationError,
} from './validation'

describe('normalizeQuestionInput', () => {
  it('trims values and removes empty note locales', () => {
    expect(normalizeQuestionInput({
      key: ' sample-key ',
      question_text: {
        de: ' Hallo ',
        en: ' Hello ',
      },
      answer_options: [
        {
          emoji: ' 😀 ',
          text: {
            de: ' Ja ',
            en: ' Yes ',
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
      },
      answer_options: [
        {
          emoji: '😀',
          text: {
            de: 'Ja',
            en: 'Yes',
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
    })).toThrowError(new QuestionInputValidationError('Question text (English) is required'))
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
    })).toThrowError(new QuestionInputValidationError('Answer option English text values must be unique'))
  })
})
