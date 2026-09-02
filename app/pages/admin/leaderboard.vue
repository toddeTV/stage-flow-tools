<script setup lang="ts">
import { pickRandomItem } from '~/utils/pickRandomItem'

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
const isWinnerModalOpen = ref(false)
const selectedWinner = ref<LeaderboardEntry>()
const winnerDialog = ref<HTMLDialogElement>()

const topRankedEntries = computed(() => leaderboard.value.filter(entry => entry.rank === 1))

function resetWinnerModal() {
  isWinnerModalOpen.value = false
  selectedWinner.value = undefined
}

function closeWinnerModal() {
  if (winnerDialog.value?.open) {
    winnerDialog.value.close()
    return
  }

  resetWinnerModal()
}

function drawWinner() {
  if (isWinnerModalOpen.value) return

  const winner = pickRandomItem(topRankedEntries.value)
  if (!winner) return

  selectedWinner.value = winner
  isWinnerModalOpen.value = true
  nextTick(() => winnerDialog.value?.showModal())
}

/** Fetch leaderboard data from the API. */
async function fetchLeaderboard() {
  closeWinnerModal()
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

    <div class="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-gray-500">
        {{ t('scoredQuestions', { count: totalQuestionsWithCorrectAnswers }) }}
      </p>
      <div class="flex gap-2">
        <UiButton
          :disabled="isLoading || isWinnerModalOpen || topRankedEntries.length === 0"
          size="small"
          @click="drawWinner"
        >
          {{ t('drawWinner') }}
        </UiButton>
        <UiButton
          :disabled="isLoading"
          size="small"
          variant="secondary"
          @click="fetchLeaderboard"
        >
          {{ t('refresh') }}
        </UiButton>
      </div>
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
          <tr class="border-b-[3px] border-black text-left tracking-wide uppercase">
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

    <dialog
      v-if="isWinnerModalOpen && selectedWinner"
      ref="winnerDialog"
      aria-describedby="winner-modal-description"
      aria-labelledby="winner-modal-title"
      class="m-auto max-h-[calc(100dvh-2.5rem)] w-[calc(100%-2.5rem)] max-w-md
        border-[3px] border-black bg-white p-6 text-black backdrop:bg-black/50"
      @click.self="closeWinnerModal"
      @close="resetWinnerModal"
    >
      <p class="text-sm font-bold tracking-wide uppercase">
        {{ t('winner') }}
      </p>
      <h2 id="winner-modal-title" class="mt-2 text-4xl leading-tight font-bold">
        {{ selectedWinner.nickname }}
      </h2>

      <dl class="mt-6 grid grid-cols-2 gap-3">
        <div class="winner-stat">
          <dt class="winner-stat-label">
            {{ t('rank') }}
          </dt>
          <dd class="winner-stat-value">
            {{ selectedWinner.rank }}
          </dd>
        </div>
        <div class="winner-stat">
          <dt class="winner-stat-label">
            {{ t('correctAnswers') }}
          </dt>
          <dd class="winner-stat-value">
            {{ selectedWinner.correctAnswers }}
          </dd>
        </div>
      </dl>

      <div class="mt-6 flex justify-end">
        <UiButton @click="closeWinnerModal">
          {{ t('close') }}
        </UiButton>
      </div>
    </dialog>
  </div>
</template>

<i18n lang="yaml">
en:
  title: Leaderboard
  rank: Rank
  player: Player
  correctAnswers: Correct
  drawWinner: Draw winner
  winner: Winner
  close: Close
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
  drawWinner: Gewinner ziehen
  winner: Gewinner
  close: Schließen
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
  drawWinner: 当選者を選ぶ
  winner: 当選者
  close: 閉じる
  refresh: 更新
  loading: 読み込み中...
  empty: まだ回答が提出されていません。
  error: リーダーボードの読み込みに失敗しました。もう一度お試しください。
  scoredQuestions: "正解のある質問数: {count}"
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.status-message {
  @apply py-10 text-center text-lg uppercase tracking-wide text-gray-400;
}

.winner-stat {
  @apply border-2 border-black p-3;
}

.winner-stat-label {
  @apply text-xs font-bold tracking-wide uppercase;
}

.winner-stat-value {
  @apply mt-1 text-2xl font-bold;
}
</style>
