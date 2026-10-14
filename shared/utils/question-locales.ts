type Translations = Record<string, string>

export function normalizeLocaleCode(value: string): string {
  return value.trim().toLowerCase()
}

/** Collects populated translation keys without exposing question content. */
export function collectQuestionLocales(questions: {
  question_text: Translations
  answer_options: { text: Translations }[]
  note?: Translations
}[]): string[] {
  const locales = new Set<string>()
  for (const question of questions) {
    const fields = [
      question.question_text,
      question.note,
      ...question.answer_options.map(option => option.text),
    ]
    for (const field of fields) {
      for (const [
        key,
        text,
      ] of Object.entries(field ?? {})) {
        const code = normalizeLocaleCode(key)
        if (code && text.trim()) locales.add(code)
      }
    }
  }
  return [
    ...locales,
  ].sort()
}

/** Missing translations fall back only to English, independently for each field. */
export function resolveLocalizedText(text: Translations | string | undefined, language: string): string {
  if (typeof text !== 'object' || text === null) return text ?? ''
  const find = (code: string) => Object.entries(text).find(([
    key,
    value,
  ]) => (
    normalizeLocaleCode(key) === code && value.trim()
  ))?.[1]
  return find(normalizeLocaleCode(language)) || find('en') || ''
}
