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
const isTogglingLock = ref(false)
const isPickingUser = ref(false)
const hasHydratedOnce = ref(false)

// Dynamic styles for core view
const coreViewStyles = computed(() => {
  if (!isCoreView.value) {
    return {}
  }
  return {
    padding: `${padding.value}px`,
    transform: `scale(${scale.value})`,
    'transform-origin': 'top left',
    width: `calc(100% / ${scale.value})`
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
      option
    }
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
      body: { questionId: results.value.question.id }
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
      method: 'POST'
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
      method: 'POST'
    })
    // The websocket will update the state.
  }
  catch (error: unknown) {
    logger_error('Failed to unpublish active question', error)
    alert('Failed to unpublish active question.')
  }
}
</script>

<template>
  <div :class="{ 'max-w-4xl mx-auto p-5 min-h-screen': !isCoreView }">
    <div :style="coreViewStyles">
      <UiPageTitle v-if="!isCoreView" class="relative page-title">{{ t('pageTitle') }}</UiPageTitle>

      <UiSection :bare="isCoreView">
        <!-- Controls -->
        <div class="mb-10 border-b-[3px] border-black pb-5">
          <div class="flex justify-between items-center text-lg">
            <span v-if="results" class="font-bold py-2 px-4 bg-gray-100 border-2 border-black">{{ t('totalVotes') }}: {{ results.totalVotes }} ({{ results.totalConnections > 0 ? Math.round((results.totalVotes / results.totalConnections) * 100) : 0 }}%)</span>
            <span v-else>&nbsp;</span>
            <div class="flex items-center gap-4">
              <UiButton @click="refreshResults" variant="secondary" size="small">
                🔄 {{ t('refreshButton') }}
              </UiButton>
              <template v-if="results">
                <UiCheckbox v-model="hideResults" size="small">
                  {{ t('hideButton') }}
                </UiCheckbox>
                <UiButton
                  :variant="results.question.is_locked ? 'primary' : 'secondary'"
                  size="small"
                  @click="toggleLock"
                  :disabled="isTogglingLock"
                >
                  {{ results.question.is_locked ? `🔒 ${t('lockedButton')}` : `🔓 ${t('openButton')}` }}
                </UiButton>
                <UiButton @click="unpublishActiveQuestion" variant="secondary" size="small">
                  {{ t('unpublishButton') }}
                </UiButton>
              </template>
              <UiButton @click="publishNextQuestion" variant="secondary" size="small">
                {{ t('nextButton') }} ➡
              </UiButton>
            </div>
          </div>
          <h2 v-if="results" class="text-3xl mt-5 leading-tight">{{ getLocalizedText(results.question.question_text) }}</h2>
        </div>

        <!-- Results Chart -->
        <template v-if="results">
          <div class="flex flex-col gap-6">
            <div
              v-for="(result, option) in results.results"
              :key="option"
              class="flex flex-col gap-2.5"
            >
              <div class="flex justify-between items-center text-lg">
                <span class="font-bold">{{ getLocalizedOption(String(option)) }} <span v-if="result.emoji && !hideResults" class="ml-2">{{ result.emoji }}</span></span>
                <div class="flex items-center gap-2">
                  <span class="py-1 px-2.5 bg-gray-100 border-2 border-black text-sm">
                    <template v-if="hideResults">?</template>
                    <template v-else>{{ result.count }}</template>
                    {{ t('votes') }}
                  </span>
                  <UiButton size="small" @click="pickRandomUser(String(option))" :disabled="isPickingUser">🎲</UiButton>
                </div>
              </div>
              <div class="h-12 bg-gray-100 border-[3px] border-black relative overflow-hidden">
                <div v-if="hideResults" class="flex items-center justify-center h-full">
                  <span class="text-2xl font-bold text-gray-400">?</span>
                </div>
                <div
                  v-else
                  class="h-full bg-black transition-width duration-500 ease-out flex items-center justify-end pr-2.5 min-w-[50px] relative result-bar"
                  :style="{ width: getBarWidth(result.count) + '%' }"
                >
                  <span class="text-white font-bold text-xl text-shadow-lg relative z-10">{{ getPercentage(result.count) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Note Display -->
          <div v-if="results.question.note && !hideResults" class="mt-8 p-4 bg-gray-100 border-2 border-black">
            <p>{{ getLocalizedText(results.question.note) }}</p>
          </div>
        </template>

        <!-- No Active Question -->
        <div v-else :class="{ 'py-20 px-8 text-center': !isCoreView }">
          <h2 class="text-3xl mb-4">{{ t('noActiveQuestion') }}</h2>
          <p class="text-xl mb-8">{{ t('waitingForQuestion') }}</p>
          <div class="flex justify-center gap-2.5">
            <span class="w-5 h-5 bg-black animate-bounce"></span>
            <span class="w-5 h-5 bg-black animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-5 h-5 bg-black animate-bounce [animation-delay:0.4s]"></span>
          </div>
        </div>
      </UiSection>
    </div>
  </div>
</template>


<i18n lang="yaml">
en:
  pageTitle: "Live Results"
  totalVotes: "Total Votes"
  hideButton: "Hide"
  lockedButton: "Locked"
  openButton: "Open"
  unpublishButton: "Unpublish"
  refreshButton: "Refresh"
  nextButton: "Next"
  votes: "votes"
  noActiveQuestion: "No Active Question"
  waitingForQuestion: "Waiting for a question to be published..."
de:
  pageTitle: "Live-Ergebnisse"
  totalVotes: "Stimmen Gesamt"
  hideButton: "Verstecken"
  lockedButton: "Gesperrt"
  openButton: "Offen"
  unpublishButton: "Veröffentlichung zurückziehen"
  refreshButton: "Aktualisieren"
  nextButton: "Nächste"
  votes: "Stimmen"
  noActiveQuestion: "Keine aktive Frage"
  waitingForQuestion: "Warten auf die Veröffentlichung einer Frage..."
ja:
  pageTitle: "ライブ結果"
  totalVotes: "総投票数"
  hideButton: "隠す"
  lockedButton: "ロック済み"
  openButton: "オープン"
  unpublishButton: "公開停止"
  refreshButton: "更新"
  nextButton: "次へ"
  votes: "票"
  noActiveQuestion: "アクティブな質問はありません"
  waitingForQuestion: "質問が公開されるのを待っています..."
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
