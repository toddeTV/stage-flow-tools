import type { LocalizedString } from '~/types'

/** Provides locale-aware text resolution with English fallback. */
export function useLocalization() {
  const { locale } = useI18n()

  /** Resolves a LocalizedString to the current locale, falling back to English. */
  function getLocalizedText(text: LocalizedString | string | undefined): string {
    if (typeof text === 'object' && text !== null) {
      return text[locale.value] || text.en || ''
    }
    return text || ''
  }

  return { getLocalizedText }
}
