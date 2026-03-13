<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const { t } = useI18n()

interface LeaderboardEntry {
  rank: number
  userId: string
  nickname: string
  correctAnswers: number
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  totalQuestionsWithCorrectAnswers: number
}

const isLoading = ref(false)
const hasError = ref(false)
const leaderboard = ref<LeaderboardEntry[]>([])
const totalQuestionsWithCorrectAnswers = ref(0)

/** Fetch leaderboard data from the API. */
async function fetchLeaderboard() {
  isLoading.value = true
  hasError.value = false
  try {
    const data = await $fetch<LeaderboardResponse>('/api/results/leaderboard')
    leaderboard.value = data.leaderboard
    totalQuestionsWithCorrectAnswers.value = data.totalQuestionsWithCorrectAnswers
  }
  catch (error: unknown) {
    logger_error('Failed to fetch leaderboard', error)
    hasError.value = true
    leaderboard.value = []
    totalQuestionsWithCorrectAnswers.value = 0
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchLeaderboard()
})
</script>

<template>
  <div class="mx-auto max-w-3xl p-5">
    <UiPageTitle>{{ t('title') }}</UiPageTitle>

    <div class="mb-5 flex items-center justify-between">
      <p class="text-sm text-gray-500">
        {{ t('scoredQuestions', { count: totalQuestionsWithCorrectAnswers }) }}
      </p>
      <UiButton
        :disabled="isLoading"
        size="small"
        variant="secondary"
        @click="fetchLeaderboard"
      >
        {{ t('refresh') }}
      </UiButton>
    </div>

    <UiSection>
      <p v-if="isLoading" class="status-message">
        {{ t('loading') }}
      </p>

      <p
        v-else-if="hasError"
        class="status-message"
      >
        {{ t('error') }}
      </p>

      <p
        v-else-if="leaderboard.length === 0"
        class="status-message"
      >
        {{ t('empty') }}
      </p>

      <table v-else class="w-full border-collapse">
        <thead>
          <tr class="border-b-[3px] border-black text-left uppercase tracking-wide">
            <th class="p-3 text-center">
              {{ t('rank') }}
            </th>
            <th class="p-3">
              {{ t('player') }}
            </th>
            <th class="p-3 text-center">
              {{ t('correctAnswers') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in leaderboard"
            :key="entry.userId"
            class="border-b border-gray-300"
          >
            <td class="p-3 text-center text-xl font-bold">
              {{ entry.rank }}
            </td>
            <td class="p-3">
              {{ entry.nickname }}
              <span class="ml-1 text-xs text-gray-400">({{ entry.userId }})</span>
            </td>
            <td class="p-3 text-center text-xl font-bold">
              {{ entry.correctAnswers }}
            </td>
          </tr>
        </tbody>
      </table>
    </UiSection>
  </div>
</template>

<i18n lang="yaml">
en:
  title: Leaderboard
  rank: Rank
  player: Player
  correctAnswers: Correct
  refresh: Refresh
  loading: Loading...
  empty: No answers submitted yet.
  error: Failed to load leaderboard. Please try again.
  scoredQuestions: "Questions with correct answers: {count}"
de:
  title: Bestenliste
  rank: Rang
  player: Spieler
  correctAnswers: Richtig
  refresh: Aktualisieren
  loading: Laden...
  empty: Noch keine Antworten eingereicht.
  error: Bestenliste konnte nicht geladen werden. Bitte erneut versuchen.
  scoredQuestions: "Fragen mit richtigen Antworten: {count}"
ja:
  title: リーダーボード
  rank: 順位
  player: プレイヤー
  correctAnswers: 正解
  refresh: 更新
  loading: 読み込み中...
  empty: まだ回答が提出されていません。
  error: リーダーボードの読み込みに失敗しました。もう一度お試しください。
  scoredQuestions: "正解のある質問数: {count}"
</i18n>

<style scoped>
.status-message {
  @apply py-10 text-center text-lg uppercase tracking-wide text-gray-400;
}
</style>
