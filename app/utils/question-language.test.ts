import { describe, expect, it } from 'vite-plus/test'
import { getLanguageOption, resolveQuestionLanguage, resolveUiLanguage } from './question-language'

describe('question language selection', () => {
  const codes = [
    'de',
    'de-de',
    'en',
    'es',
    'xx',
  ]

  it('uses URL, previous selection, path, browser, then English in order', () => {
    expect(resolveQuestionLanguage(codes, { query: ' ES ', previous: 'de', pathLocale: 'en' })).toBe('es')
    expect(resolveQuestionLanguage(codes, { query: 'missing', previous: 'xx', pathLocale: 'de' })).toBe('xx')
    expect(resolveQuestionLanguage(codes, { query: '', pathLocale: 'de', browserLocale: 'es' })).toBe('de')
    expect(resolveQuestionLanguage(codes, { query: [
      'es',
      'de',
    ], browserLocale: 'es-MX' })).toBe('es')
    expect(resolveQuestionLanguage(codes, { browserLocale: 'de-DE' })).toBe('de-de')
    expect(resolveQuestionLanguage(codes, { query: 'es-MX' })).toBe('en')
    expect(resolveQuestionLanguage(codes, {})).toBe('en')
    expect(resolveQuestionLanguage([], {})).toBe('en')
  })

  it('keeps UI locales separate from arbitrary content languages', () => {
    expect(resolveUiLanguage('de-de', [
      'en',
      'de',
      'fr',
      'ja',
    ])).toBe('de')
    expect(resolveUiLanguage('es', [
      'en',
      'de',
      'fr',
      'ja',
    ])).toBe('en')
    expect(resolveUiLanguage('xx', [
      'en',
      'de',
      'fr',
      'ja',
    ])).toBe('en')
  })

  it('maps known names and flags, leaving unknown keys unchanged', () => {
    expect(getLanguageOption('es')).toEqual({ code: 'es', name: 'Español', flag: '🇪🇸', label: '🇪🇸 Español' })
    expect(getLanguageOption('xx')).toEqual({ code: 'xx', name: 'xx', flag: '', label: 'xx' })
    expect(getLanguageOption('constructor').label).toBe('constructor')
  })
})
