<script setup lang="ts">
import type { Results } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: false,
  background: false,
  localeSwitcher: true,
})

const { results } = useQuizSocket('results')
const { t } = useI18n()
const { getLocalizedText } = useLocalization()

// Look up the localized display text for a result key (English answer text)
function getLocalizedOption(enKey: string): string {
  const option = results.value?.question.answer_options.find(o => o.text.en === enKey)
  return option ? getLocalizedText(option.text) : enKey
}

const route = useRoute()
const isCoreView = computed(() => route.query.core !== undefined)

// State for core view parameters
const padding = ref(route.query.padding ? Number(route.query.padding) : 0)
const scale = ref(route.query.scale ? Number(route.query.scale) : 1)

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

// Dynamic styles for core view
const coreViewStyles = computed(() => {
  if (!isCoreView.value) {
    return {}
  }
  return {
    'padding': `${padding.value}px`,
    'transform': `scale(${scale.value})`,
    'transform-origin': 'top left',
    'width': `calc(100% / ${scale.value})`,
  }
})

// Fetch initial results
const { data: fetchedResults, refresh: refreshResults } = await useFetch<Results>('/api/results/current')

watch(fetchedResults, (newResults) => {
  if (newResults && newResults.question) {
    results.value = newResults
  }
  else {
    results.value = null
  }
}, { immediate: true })

// Watch for new questions and update visibility based on the mode
watch(() => results.value?.question.id, (newId, oldId) => {
  if (!newId || newId === oldId) return

  // Skip the very first hydration (undefined -> newId)
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

// Shuffle order when scramble is active, or persist shuffled order when
// scramble=hide was set via URL (so unchecking the checkbox reveals texts
// without jumping answers back to their original positions).
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

// Calculate bar width
function getBarWidth(count: number) {
  if (!results.value || results.value.totalVotes === 0) {
    return 0
  }

  const maxVotes = Math.max(...Object.values(results.value.results).map(r => r.count))
  if (maxVotes === 0) {
    return 0
  }

  // Scale to max 90% width for best visual
  return (count / maxVotes) * 90
}

// Calculate percentage
function getPercentage(count: number) {
  if (!results.value || results.value.totalVotes === 0) {
    return 0
  }
  return Math.round((count / results.value.totalVotes) * 100)
}

function pickRandomUser(option: string) {
  if (isPickingUser.value) return
  isPickingUser.value = true

  // Optimistic UI: Assume success and let the websocket handle the notification.
  $fetch('/api/results/pick-random-user', {
    method: 'POST',
    body: {
      questionId: results.value?.question.id,
      option,
    },
  }).catch((error: unknown) => {
    logger_error('Failed to pick random user:', error)
    alert('An error occurred while picking a random user. Please try again.')
  }).finally(() => {
    isPickingUser.value = false
  })
}

async function toggleLock() {
  if (!results.value?.question || isTogglingLock.value) return

  isTogglingLock.value = true
  const originalState = results.value.question.is_locked

  // Optimistically update the UI
  results.value.question.is_locked = !results.value.question.is_locked

  try {
    await $fetch('/api/questions/toggle-lock', {
      method: 'POST',
      body: { questionId: results.value.question.id },
    })
    // The websocket will eventually confirm the state, but the UI is already updated.
  }
  catch (error: unknown) {
    results.value.question.is_locked = originalState // Revert on error
    logger_error('Failed to toggle lock status from results page', error)
    alert('Failed to toggle lock status. See console for details.')
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
    // The websocket will update the state, no need to manually refresh here.
  }
  catch (error: unknown) {
    logger_error('Failed to publish next question', error)
    alert('Failed to publish next question. Maybe there are no unpublished questions left.')
  }
}

async function unpublishActiveQuestion() {
  try {
    await $fetch('/api/questions/unpublish-active', {
      method: 'POST',
    })
    // The websocket will update the state.
  }
  catch (error: unknown) {
    logger_error('Failed to unpublish active question', error)
    alert('Failed to unpublish active question.')
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
    alert(t('failedResetAnswers'))
  }
  finally {
    isResettingAnswers.value = false
  }
}
</script>

<template>
  <div :class="{ 'mx-auto min-h-screen max-w-4xl p-5': !isCoreView }">
    <div :style="coreViewStyles">
      <UiPageTitle v-if="!isCoreView" class="page-title relative">
        {{ t('pageTitle') }}
      </UiPageTitle>

      <UiSection :bare="isCoreView">
        <!-- Controls -->
        <div class="mb-10 border-b-[3px] border-black pb-5">
          <div class="flex items-center justify-between text-lg">
            <span
              v-if="results"
              class="border-2 border-black bg-gray-100 px-4 py-2 font-bold"
            >
              {{ t('totalVotes') }}: {{ results.totalVotes }}
              ({{
                results.totalConnections > 0
                  ? Math.round((results.totalVotes / results.totalConnections) * 100)
                  : 0
              }}%)
            </span>
            <span v-else>&nbsp;</span>
            <div class="flex items-center gap-4">
              <UiButton size="small" variant="secondary" @click="refreshResults">
                🔄 {{ t('refreshButton') }}
              </UiButton>
              <template v-if="results">
                <UiCheckbox v-model="hideResults" size="small">
                  {{ t('hideButton') }}
                </UiCheckbox>
                <UiCheckbox v-model="scrambleResults" size="small">
                  {{ t('scrambleButton') }}
                </UiCheckbox>
                <UiCheckbox v-model="showEmoji" size="small">
                  {{ t('emojiButton') }}
                </UiCheckbox>
                <UiButton
                  :disabled="isTogglingLock"
                  size="small"
                  :variant="results.question.is_locked ? 'primary' : 'secondary'"
                  @click="toggleLock"
                >
                  {{ results.question.is_locked ? `🔒 ${t('lockedButton')}` : `🔓 ${t('openButton')}` }}
                </UiButton>
                <UiButton
                  :disabled="isResettingAnswers"
                  size="small"
                  variant="danger"
                  @click="resetAnswers"
                >
                  {{ isResettingAnswers ? t('resettingAnswers') : t('resetAnswers') }}
                </UiButton>
                <UiButton size="small" variant="secondary" @click="unpublishActiveQuestion">
                  {{ t('unpublishButton') }}
                </UiButton>
              </template>
              <UiButton size="small" variant="secondary" @click="publishNextQuestion">
                {{ t('nextButton') }} ➡
              </UiButton>
            </div>
          </div>
          <h2 v-if="results" class="mt-5 text-3xl leading-tight">
            {{ getLocalizedText(results.question.question_text) }}
          </h2>
        </div>

        <!-- Results Chart -->
        <template v-if="results">
          <div class="flex flex-col gap-6">
            <div
              v-for="[option, result] in displayResults"
              :key="option"
              class="flex flex-col gap-2.5"
            >
              <div class="flex items-center justify-between text-lg">
                <span class="font-bold">
                  <template v-if="scrambleResults">?</template>
                  <template v-else>{{ getLocalizedOption(String(option)) }}</template>
                  <span v-if="result.emoji && showEmoji" class="ml-2">
                    {{ result.emoji }}
                  </span>
                </span>
                <div class="flex items-center gap-2">
                  <span class="border-2 border-black bg-gray-100 px-2.5 py-1 text-sm">
                    <template v-if="hideResults">?</template>
                    <template v-else>{{ result.count }}</template>
                    {{ t('votes') }}
                  </span>
                  <UiButton :disabled="isPickingUser" size="small" @click="pickRandomUser(String(option))">
                    🎲
                  </UiButton>
                </div>
              </div>
              <div class="relative h-12 overflow-hidden border-[3px] border-black bg-gray-100">
                <div v-if="hideResults" class="flex h-full items-center justify-center">
                  <span class="text-2xl font-bold text-gray-400">?</span>
                </div>
                <div
                  v-else
                  class="transition-width result-bar relative flex h-full
                    min-w-[50px] items-center justify-end bg-black
                    pr-2.5 duration-500 ease-out"
                  :style="{ width: getBarWidth(result.count) + '%' }"
                >
                  <span class="text-shadow-lg relative z-10 text-xl font-bold text-white">
                    {{ getPercentage(result.count) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Note Display -->
          <div
            v-if="results.question.note && !hideResults && !scrambleResults"
            class="mt-8 border-2 border-black bg-gray-100 p-4"
          >
            <p>{{ getLocalizedText(results.question.note) }}</p>
          </div>
        </template>

        <!-- No Active Question -->
        <div v-else :class="{ 'px-8 py-20 text-center': !isCoreView }">
          <h2 class="mb-4 text-3xl">
            {{ t('noActiveQuestion') }}
          </h2>
          <p class="mb-8 text-xl">
            {{ t('waitingForQuestion') }}
          </p>
          <div class="flex justify-center gap-2.5">
            <span class="size-5 animate-bounce bg-black" />
            <span class="size-5 animate-bounce bg-black [animation-delay:0.2s]" />
            <span class="size-5 animate-bounce bg-black [animation-delay:0.4s]" />
          </div>
        </div>
      </UiSection>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  pageTitle: Live Results
  totalVotes: Total Votes
  hideButton: Hide
  scrambleButton: Scramble
  emojiButton: Emoji
  lockedButton: Locked
  openButton: Open
  resetAnswers: Reset Answers
  resettingAnswers: Resetting...
  unpublishButton: Unpublish
  refreshButton: Refresh
  nextButton: Next
  confirmResetAnswers: Delete all submitted answers for current question?
  failedResetAnswers: Failed to reset answers.
  votes: votes
  noActiveQuestion: No Active Question
  waitingForQuestion: Waiting for a question to be published...
de:
  pageTitle: Live-Ergebnisse
  totalVotes: Stimmen Gesamt
  hideButton: Verstecken
  scrambleButton: Mischen
  emojiButton: Emoji
  lockedButton: Gesperrt
  openButton: Offen
  resetAnswers: Antworten zurücksetzen
  resettingAnswers: Antworten werden zurückgesetzt...
  unpublishButton: Veröffentlichung zurückziehen
  refreshButton: Aktualisieren
  nextButton: Nächste
  confirmResetAnswers: Alle abgegebenen Antworten für die aktuelle Frage löschen?
  failedResetAnswers: Antworten konnten nicht zurückgesetzt werden.
  votes: Stimmen
  noActiveQuestion: Keine aktive Frage
  waitingForQuestion: Warten auf die Veröffentlichung einer Frage...
ja:
  pageTitle: ライブ結果
  totalVotes: 総投票数
  hideButton: 隠す
  scrambleButton: シャッフル
  emojiButton: 絵文字
  lockedButton: ロック済み
  openButton: オープン
  resetAnswers: 回答をリセット
  resettingAnswers: リセット中...
  unpublishButton: 公開停止
  refreshButton: 更新
  nextButton: 次へ
  confirmResetAnswers: 現在の質問の回答を全て削除しますか？
  failedResetAnswers: 回答のリセットに失敗しました。
  votes: 票
  noActiveQuestion: アクティブな質問はありません
  waitingForQuestion: 質問が公開されるのを待っています...
</i18n>

<style scoped>
@reference "tailwindcss";

.page-title::after {
  content: '●';
  position: absolute;
  right: 20px;
  color: #ff0000;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.result-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.1) 10px,
    rgba(255, 255, 255, 0.1) 20px
  );
}

.text-shadow-lg {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
</style>
