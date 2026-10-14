import { normalizeLocaleCode } from '#shared/utils/question-locales'
import { getLanguageOption, resolveQuestionLanguage, resolveUiLanguage } from '~/utils/question-language'

/** Shares the page-load language pool and content selection across all views. */
export function useQuestionLanguage() {
  const codes = useState<string[]>('question-locales', () => [
    'en',
  ])
  const language = useState<string>('question-language', () => '')
  const availableLanguages = computed(() => codes.value.map(getLanguageOption))
  const route = useRoute()
  const router = useRouter()

  function selectLanguage(value: string) {
    const code = normalizeLocaleCode(value)
    if (!codes.value.includes(code)) return
    language.value = code
    return router.replace({ query: { ...route.query, language: code }, hash: route.hash })
  }

  /** Called once from the app root; no polling or refresh on navigation. */
  function initialize() {
    const { locale, locales } = useI18n({ useScope: 'global' })
    const uiCodes = locales.value.map(item => typeof item === 'string' ? item : item.code)
    const { data, status } = useAsyncData('question-locales', () => $fetch<string[]>('/api/questions/locales'))
    let hasResolved = false

    watch([
      data,
      status,
      () => route.fullPath,
    ], () => {
      if (status.value !== 'success' && status.value !== 'error') return
      codes.value = data.value?.length ? data.value : [
        'en',
      ]
      const pathLocale = route.path.split('/')[1]
      language.value = resolveQuestionLanguage(codes.value, {
        query: route.query.language,
        previous: hasResolved ? language.value : undefined,
        pathLocale: uiCodes.some(code => code === pathLocale) ? pathLocale : undefined,
        browserLocale: navigator.language,
      })
      hasResolved = true
    }, { immediate: true, flush: 'post' })

    // Nuxt's route detection may change the UI locale after navigation.
    watch([
      language,
      locale,
    ], () => {
      if (hasResolved) locale.value = resolveUiLanguage(language.value, uiCodes)
    }, { flush: 'post' })
  }

  return { availableLanguages, codes, initialize, language, selectLanguage }
}
