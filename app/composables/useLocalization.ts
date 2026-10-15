import type { LocalizedString } from '~/types'
import { resolveLocalizedText } from '#shared/utils/question-locales'

/** Provides locale-aware text resolution with English fallback. */
export function useLocalization() {
  const { language } = useQuestionLanguage()

  /** Resolves a LocalizedString to the current locale, falling back to English. */
  function getLocalizedText(text: LocalizedString | string | undefined): string {
    return resolveLocalizedText(text, language.value)
  }

  return { getLocalizedText }
}
