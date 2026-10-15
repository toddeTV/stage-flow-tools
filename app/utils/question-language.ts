import { normalizeLocaleCode } from '#shared/utils/question-locales'

const languageMap: Record<string, { name: string, flag: string }> = {
  en: { name: 'English', flag: '🇺🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
  ja: { name: '日本語', flag: '🇯🇵' },
  es: { name: 'Español', flag: '🇪🇸' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  pt: { name: 'Português', flag: '🇵🇹' },
  nl: { name: 'Nederlands', flag: '🇳🇱' },
  pl: { name: 'Polski', flag: '🇵🇱' },
  uk: { name: 'Українська', flag: '🇺🇦' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  zh: { name: '中文', flag: '🇨🇳' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  ko: { name: '한국어', flag: '🇰🇷' },
}

export function getLanguageOption(code: string) {
  const metadata = Object.hasOwn(languageMap, code) ? languageMap[code] : undefined
  const name = metadata?.name ?? code
  const flag = metadata?.flag ?? ''
  return { code, name, flag, label: flag ? `${flag} ${name}` : name }
}

export function resolveQuestionLanguage(codes: string[], preferences: {
  query?: unknown
  previous?: string
  pathLocale?: string
  browserLocale?: string
}): string {
  const candidates = [
    typeof preferences.query === 'string' ? preferences.query : '',
    preferences.previous,
    preferences.pathLocale,
    preferences.browserLocale,
    preferences.browserLocale?.split('-')[0],
    'en',
  ]
  for (const candidate of candidates) {
    const code = normalizeLocaleCode(candidate ?? '')
    if (code && codes.includes(code)) return code
  }
  return codes[0] ?? 'en'
}

export function resolveUiLanguage<Code extends string>(language: string, codes: Code[]): Code | 'en' {
  const code = normalizeLocaleCode(language)
  const base = code.split('-')[0] ?? code
  return codes.find(candidate => candidate === code) ?? codes.find(candidate => candidate === base) ?? 'en'
}
