import type { Ref } from 'vue'
import type { Results } from '~/types'

type UseAdminResultsOptions = {
  fetchedResults: Ref<Results | null | undefined>
  refreshResults: () => Promise<unknown>
  results: Ref<Results | null>
}

/** Owns result-display modes, derived values, and administrative result actions. */
export function useAdminResults({
  fetchedResults,
  refreshResults,
  results,
}: UseAdminResultsOptions) {
  const { t } = useI18n()
  const { getLocalizedText } = useLocalization()
  const { getErrorMessage } = useApiError()
  const route = useRoute()

  const visibility = ref(
    (route.query.visibility as string) || 'hide',
  )
  const hideResults = ref(visibility.value.startsWith('hide'))
  const scramble = ref(
    (route.query.scramble as string) || 'show',
  )
  const scrambleResults = ref(scramble.value.startsWith('hide'))
  const showEmoji = ref(false)
  const isTogglingLock = ref(false)
  const isPickingUser = ref(false)
  const isResettingAnswers = ref(false)
  const hasHydratedOnce = ref(false)

  function getLocalizedOption(enKey: string): string {
    const option = results.value?.question.answer_options.find(option => option.text.en === enKey)
    return option ? getLocalizedText(option.text) : enKey
  }

  watch(fetchedResults, (newResults) => {
    if (newResults && newResults.question) {
      results.value = newResults
    }
    else {
      results.value = null
    }
  }, { immediate: true })

  watch(() => results.value?.question.id, (newId, oldId) => {
    if (!newId || newId === oldId) return

    if (oldId === undefined && !hasHydratedOnce.value) {
      hasHydratedOnce.value = true
      return
    }
    hasHydratedOnce.value = true

    if (visibility.value === 'hide') {
      hideResults.value = true
    }
    else if (visibility.value === 'show') {
      hideResults.value = false
    }

    if (scramble.value === 'hide') {
      scrambleResults.value = true
    }
    else if (scramble.value === 'show') {
      scrambleResults.value = false
    }

    showEmoji.value = false
  })

  const useShuffledOrder = computed(() =>
    scramble.value === 'hide' || scrambleResults.value,
  )

  const displayResults = computed(() => {
    if (!results.value) return []
    const entries = Object.entries(results.value.results)
    if (useShuffledOrder.value) {
      return seededShuffle(entries, results.value.question.id)
    }
    return entries
  })

  function getBarWidth(count: number) {
    if (!results.value || results.value.totalVotes === 0) {
      return 0
    }

    const maxVotes = Math.max(...Object.values(results.value.results).map(result => result.count))
    if (maxVotes === 0) {
      return 0
    }

    return (count / maxVotes) * 90
  }

  function getPercentage(count: number) {
    if (!results.value || results.value.totalVotes === 0) {
      return 0
    }
    return Math.round((count / results.value.totalVotes) * 100)
  }

  function pickRandomUser(option: string) {
    if (isPickingUser.value) return
    isPickingUser.value = true

    $fetch('/api/results/pick-random-user', {
      method: 'POST',
      body: {
        questionId: results.value?.question.id,
        option,
      },
    }).catch((error: unknown) => {
      logger_error('Failed to pick random user:', error)
      alert(getErrorMessage(error))
    }).finally(() => {
      isPickingUser.value = false
    })
  }

  async function toggleLock() {
    if (!results.value?.question || isTogglingLock.value) return

    isTogglingLock.value = true
    const originalState = results.value.question.is_locked

    results.value.question.is_locked = !results.value.question.is_locked

    try {
      await $fetch('/api/questions/toggle-lock', {
        method: 'POST',
        body: { questionId: results.value.question.id },
      })
    }
    catch (error: unknown) {
      results.value.question.is_locked = originalState
      logger_error('Failed to toggle lock status from results page', error)
      alert(getErrorMessage(error))
    }
    finally {
      isTogglingLock.value = false
    }
  }

  async function publishNextQuestion() {
    try {
      await $fetch('/api/questions/publish-next', {
        method: 'POST',
      })
    }
    catch (error: unknown) {
      logger_error('Failed to publish next question', error)
      alert(getErrorMessage(error))
    }
  }

  async function unpublishActiveQuestion() {
    try {
      await $fetch('/api/questions/unpublish-active', {
        method: 'POST',
      })
    }
    catch (error: unknown) {
      logger_error('Failed to unpublish active question', error)
      alert(getErrorMessage(error))
    }
  }

  async function resetAnswers() {
    if (!results.value?.question || isResettingAnswers.value) return

    if (!window.confirm(t('confirmResetAnswers'))) {
      return
    }

    isResettingAnswers.value = true

    try {
      await $fetch('/api/answers/reset', {
        method: 'POST',
      })
      await refreshResults()
    }
    catch (error: unknown) {
      logger_error('Failed to reset answers from results page', error)
      alert(getErrorMessage(error))
    }
    finally {
      isResettingAnswers.value = false
    }
  }

  return {
    displayResults,
    getBarWidth,
    getLocalizedOption,
    getLocalizedText,
    getPercentage,
    hideResults,
    isPickingUser,
    isResettingAnswers,
    isTogglingLock,
    pickRandomUser,
    publishNextQuestion,
    resetAnswers,
    scrambleResults,
    showEmoji,
    t,
    toggleLock,
    unpublishActiveQuestion,
  }
}
