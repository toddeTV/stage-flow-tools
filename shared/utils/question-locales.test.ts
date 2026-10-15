import { describe, expect, it } from 'vite-plus/test'
import type { QuestionPackageQuestion } from '../../app/types'
import { collectQuestionLocales, resolveLocalizedText } from './question-locales'

describe('question translation pool', () => {
  it('collects every populated field, including disabled questions and regional keys', () => {
    const questions: QuestionPackageQuestion[] = [
      {
        is_disabled: false,
        question_text: { en: 'Question', ' ES ': 'Pregunta', blank: '  ' },
        answer_options: [
          { text: { en: 'Answer', 'DE-de': 'Antwort' } },
        ],
        note: { en: 'Note', xx: 'Note in a custom language', ' ': 'No key' },
      },
      {
        is_disabled: true,
        question_text: { en: 'Disabled question', fr: 'Question désactivée', es: 'Otra pregunta' },
        answer_options: [],
      },
    ]
    expect(collectQuestionLocales(questions)).toEqual([
      'de-de',
      'en',
      'es',
      'fr',
      'xx',
    ])
    expect(collectQuestionLocales([])).toEqual([])
  })

  it('matches normalized keys and falls back directly to English per field', () => {
    expect(resolveLocalizedText({ en: 'English', ' ES ': 'Español' }, ' es ')).toBe('Español')
    expect(resolveLocalizedText({ en: 'English', es: '  ', fr: 'Français' }, 'es')).toBe('English')
    expect(resolveLocalizedText({ en: 'English', de: 'Deutsch' }, 'de-DE')).toBe('English')
    expect(resolveLocalizedText({ fr: 'Français' }, 'es')).toBe('')
    expect(resolveLocalizedText(undefined, 'es')).toBe('')
    expect(resolveLocalizedText('Plain text', 'es')).toBe('Plain text')
  })
})
