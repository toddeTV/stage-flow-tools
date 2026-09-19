import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import type { Ref } from 'vue'
import type {
  LocalizedString,
  QuizRecap,
  QuizRecapHighlight,
} from '~/types'

/** Owns recap query options, localized display data, and refresh polling. */
export function useAdminRecap(refreshIntervalMs: Readonly<Ref<number>>) {
  const { t, locale = ref('en') } = useI18n()
  const route = useRoute()
  const isLoading = ref(false)
  const hasError = ref(false)
  const hasLoadedRecap = ref(false)
  const hasRefreshError = ref(false)
  const recap = ref<QuizRecap>()
  let refreshTimer: ReturnType<typeof setInterval> | undefined

  function singleQueryValue(key: string) {
    const value = route.query[key]
    return typeof value === 'string' ? value : undefined
  }

  const highlightCount = computed(() => {
    const value = singleQueryValue('count')
    if (!value || !/^[1-4]$/.test(value)) return 4
    return Number(value)
  })

  function normalizeLocaleCode(value: string | undefined) {
    return value?.trim().toLowerCase() || undefined
  }

  const displayLanguage = computed(() => normalizeLocaleCode(singleQueryValue('language')))

  /** Resolves display copy through presentation language, UI locale, English, then first translation. */
  function localizedText(text: LocalizedString) {
    const candidates = [
      displayLanguage.value,
      displayLanguage.value?.split('-')[0],
      normalizeLocaleCode(locale.value),
      normalizeLocaleCode(locale.value)?.split('-')[0],
      'en',
    ]

    for (const candidate of candidates) {
      if (!candidate) continue
      const translation = Object.entries(text).find(([
        key,
        value,
      ]) => (
        normalizeLocaleCode(key) === candidate && value
      ))?.[1]
      if (translation) return translation
    }

    return Object.values(text)[0] ?? ''
  }

  const visibleHighlights = computed(() => recap.value?.highlights.slice(0, highlightCount.value) ?? [])
  const accuracy = computed(() => {
    const totals = recap.value?.totals
    if (!totals || totals.scoredAnswers === 0) return '—'
    return `${Math.round((totals.correctAnswers / totals.scoredAnswers) * 100)}%`
  })

  function highlightTitle(kind: QuizRecapHighlight['kind']) {
    return t(`highlight.${kind}`)
  }

  function highlightDescription(highlight: QuizRecapHighlight) {
    if (highlight.kind === 'best-known' || highlight.kind === 'hardest') {
      return t('correctOf', {
        correct: highlight.correctAnswerCount,
        total: highlight.answerCount,
      })
    }

    return t('answersCount', { count: highlight.answerCount })
  }

  function highlightMetric(highlight: QuizRecapHighlight) {
    if (highlight.kind === 'best-known' || highlight.kind === 'hardest') {
      return `${Math.round((highlight.correctAnswerCount / highlight.answerCount) * 100)}%`
    }

    if (highlight.kind === 'closest-call') {
      return `${highlight.leadingOptions[0].count} : ${highlight.leadingOptions[1].count}`
    }

    return String(highlight.answerCount)
  }

  /** Fetches aggregate recap data while preserving the last usable response on refresh errors. */
  async function fetchRecap() {
    if (isLoading.value) return

    isLoading.value = true
    if (!hasLoadedRecap.value) hasError.value = false

    try {
      recap.value = await $fetch<QuizRecap>('/api/results/recap')
      hasLoadedRecap.value = true
      hasError.value = false
      hasRefreshError.value = false
    }
    catch (error: unknown) {
      logger_error('Failed to fetch quiz recap', error)
      if (hasLoadedRecap.value) hasRefreshError.value = true
      else hasError.value = true
    }
    finally {
      isLoading.value = false
    }
  }

  function stopPolling() {
    if (refreshTimer === undefined) return
    clearInterval(refreshTimer)
    refreshTimer = undefined
  }

  function restartPolling() {
    stopPolling()
    if (refreshIntervalMs.value === 0) return
    refreshTimer = setInterval(() => void fetchRecap(), refreshIntervalMs.value)
  }

  onMounted(() => {
    void fetchRecap()
    restartPolling()
  })

  onBeforeUnmount(stopPolling)
  watch(refreshIntervalMs, restartPolling)

  return {
    accuracy,
    fetchRecap,
    hasError,
    hasLoadedRecap,
    hasRefreshError,
    highlightDescription,
    highlightMetric,
    highlightTitle,
    isLoading,
    localizedText,
    recap,
    t,
    visibleHighlights,
  }
}
