<script setup lang="ts">
import { useDisplayParameters } from '~/composables/useDisplayParameters'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const { t } = useI18n()
const {
  backgroundStyles,
  colorMode,
  coreViewStyles,
  isCoreView,
  refreshIntervalMs,
  showUserId: initialShowUserId,
} = useDisplayParameters()

interface LeaderboardEntry {
  rank: number
  userId: string
  nickname: string
  correctAnswers: number
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  totalPublishedQuestions: number
  totalQuestionsWithCorrectAnswers: number
}

const isLoading = ref(false)
const hasError = ref(false)
const hasLoadedLeaderboard = ref(false)
const isOver9000Mode = ref(false)
const showUserId = ref(initialShowUserId.value)
const leaderboard = ref<LeaderboardEntry[]>([])
const totalPublishedQuestions = ref(0)
const totalQuestionsWithCorrectAnswers = ref(0)
const isWinnerModalOpen = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | undefined

const topRankedEntries = computed(() => leaderboard.value.filter(entry => entry.rank === 1))

function toggleOver9000Mode() {
  isOver9000Mode.value = !isOver9000Mode.value
}

function toggleUserIdVisibility() {
  showUserId.value = !showUserId.value
}

function openWinnerModal() {
  if (isWinnerModalOpen.value || topRankedEntries.value.length === 0) return

  isWinnerModalOpen.value = true
}

/** Fetch leaderboard data from the API. */
async function fetchLeaderboard() {
  if (isLoading.value) {
    return
  }

  isLoading.value = true
  if (!hasLoadedLeaderboard.value) {
    hasError.value = false
  }

  try {
    const data = await $fetch<LeaderboardResponse>('/api/results/leaderboard')
    leaderboard.value = data.leaderboard
    totalPublishedQuestions.value = data.totalPublishedQuestions
    totalQuestionsWithCorrectAnswers.value = data.totalQuestionsWithCorrectAnswers
    hasLoadedLeaderboard.value = true
    hasError.value = false
  }
  catch (error: unknown) {
    logger_error('Failed to fetch leaderboard', error)
    if (!hasLoadedLeaderboard.value) {
      hasError.value = true
    }
  }
  finally {
    isLoading.value = false
  }
}

function stopPolling() {
  if (refreshTimer === undefined) {
    return
  }

  clearInterval(refreshTimer)
  refreshTimer = undefined
}

function restartPolling() {
  stopPolling()

  if (refreshIntervalMs.value === 0) {
    return
  }

  refreshTimer = setInterval(() => {
    void fetchLeaderboard()
  }, refreshIntervalMs.value)
}

onMounted(() => {
  void fetchLeaderboard()
  restartPolling()
})

onBeforeUnmount(() => {
  stopPolling()
})

watch(refreshIntervalMs, restartPolling)
</script>

<template>
  <div class="leaderboard-page flex-1" :data-color-mode="colorMode" :style="backgroundStyles">
    <div
      class="leaderboard-content"
      :class="{ 'mx-auto max-w-3xl p-5': !isCoreView }"
      :style="coreViewStyles"
    >
      <AdminBackLink v-if="!isCoreView" />
      <UiPageTitle v-if="!isCoreView" class="leaderboard-title">
        {{ t('title') }}
      </UiPageTitle>

      <div class="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="score-summary text-sm text-gray-500">
          {{ t('scoredQuestions', { count: totalQuestionsWithCorrectAnswers }) }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UiButton
            class="inline-flex items-center gap-2"
            :disabled="isLoading || isWinnerModalOpen || topRankedEntries.length === 0"
            size="small"
            @click="openWinnerModal"
          >
            <span aria-hidden="true">🏆</span>
            {{ t('drawWinner') }}
          </UiButton>
          <UiButton
            :aria-label="isOver9000Mode ? t('showScores') : t('over9000')"
            :aria-pressed="isOver9000Mode"
            :disabled="isLoading || leaderboard.length === 0"
            size="small"
            :variant="isOver9000Mode ? 'primary' : 'secondary'"
            @click="toggleOver9000Mode"
          >
            <span aria-hidden="true">🐉</span>
          </UiButton>
          <UiButton
            size="small"
            variant="secondary"
            @click="toggleUserIdVisibility"
          >
            {{ showUserId ? t('hideUserIds') : t('showUserIds') }}
          </UiButton>
          <UiButton
            class="inline-flex items-center gap-2"
            :disabled="isLoading"
            size="small"
            variant="secondary"
            @click="fetchLeaderboard"
          >
            <Icon aria-hidden="true" class="size-4" name="ph:arrow-clockwise" />
            {{ t('refresh') }}
          </UiButton>
        </div>
      </div>

      <UiSection :bare="isCoreView" class="leaderboard-section">
        <p v-if="isLoading && !hasLoadedLeaderboard" class="status-message">
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

        <table
          v-else
          class="leaderboard-table"
          :class="isCoreView ? 'w-full border-collapse bg-white' : 'w-full border-collapse'"
        >
          <thead>
            <tr
              :class="isCoreView
                ? 'border-b-[3px] border-black bg-black text-left tracking-wide text-white uppercase'
                : 'border-b-[3px] border-black text-left tracking-wide uppercase'"
            >
              <th :class="isCoreView ? 'p-5 text-center text-3xl' : 'p-3 text-center'">
                {{ t('rank') }}
              </th>
              <th :class="isCoreView ? 'p-5 text-3xl' : 'p-3'">
                {{ t('player') }}
              </th>
              <th :class="isCoreView ? 'p-5 text-center text-3xl' : 'p-3 text-center'">
                {{ t('correctAnswers') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in leaderboard"
              :key="entry.userId"
              class="leaderboard-row"
              :class="isCoreView
                ? [
                  'border-b border-black',
                  { 'bg-black text-white': entry.rank === 1 },
                ]
                : 'border-b border-gray-300'"
            >
              <td :class="isCoreView ? 'p-5 text-center text-5xl font-bold' : 'p-3 text-center text-xl font-bold'">
                {{ entry.rank }}
              </td>
              <td :class="isCoreView ? 'p-5 text-4xl font-bold' : 'p-3'">
                {{ entry.nickname }}
                <span
                  v-if="showUserId"
                  class="user-id"
                  :class="isCoreView ? 'ml-2 text-lg font-normal opacity-70' : 'ml-1 text-xs text-gray-400'"
                >
                  ({{ entry.userId }})
                </span>
              </td>
              <td :class="isCoreView ? 'p-5 text-center text-5xl font-bold' : 'p-3 text-center text-xl font-bold'">
                {{ isOver9000Mode ? '>9000' : entry.correctAnswers }}
              </td>
            </tr>
          </tbody>
        </table>
      </UiSection>

      <AdminLeaderboardWinnerDialog
        v-if="isWinnerModalOpen"
        v-model="isWinnerModalOpen"
        :candidates="topRankedEntries"
        :color-mode="colorMode"
        :total-published-questions="totalPublishedQuestions"
        :translate="t"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  title: Leaderboard
  rank: Rank
  player: Player
  correctAnswers: Correct
  drawWinner: Draw winner
  over9000: 🐉 Over 9000!
  showScores: 🐉 Show scores
  showUserIds: Show IDs
  hideUserIds: Hide IDs
  winner: Winner
  winnerDrawHint: The person with the most correct answers will be drawn. Ties are decided at random.
  drawingWinner: Drawing winner...
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
  over9000: 🐉 Über 9000!
  showScores: 🐉 Punkte zeigen
  showUserIds: IDs zeigen
  hideUserIds: IDs ausblenden
  winner: Gewinner
  winnerDrawHint: Die Person mit den meisten richtigen Antworten wird gezogen. Bei Gleichstand entscheidet der Zufall.
  drawingWinner: Auslosung läuft...
  close: Schließen
  refresh: Aktualisieren
  loading: Laden...
  empty: Noch keine Antworten eingereicht.
  error: Bestenliste konnte nicht geladen werden. Bitte erneut versuchen.
  scoredQuestions: "Fragen mit richtigen Antworten: {count}"
fr:
  title: Classement
  rank: Rang
  player: Joueur
  correctAnswers: Bonnes réponses
  drawWinner: Tirer un gagnant
  over9000: 🐉 Plus de 9000 !
  showScores: 🐉 Afficher les scores
  showUserIds: Afficher les identifiants
  hideUserIds: Masquer les identifiants
  winner: Gagnant
  winnerDrawHint: >-
    La personne ayant le plus de bonnes réponses sera tirée au sort. Les égalités seront départagées au hasard.
  drawingWinner: Tirage au sort...
  close: Fermer
  refresh: Actualiser
  loading: Chargement...
  empty: Aucune réponse soumise pour l'instant.
  error: Impossible de charger le classement. Réessayez.
  scoredQuestions: "Questions avec des bonnes réponses : {count}"
ja:
  title: リーダーボード
  rank: 順位
  player: プレイヤー
  correctAnswers: 正解
  drawWinner: 当選者を選ぶ
  over9000: 🐉 9000以上！
  showScores: 🐉 得点を表示
  showUserIds: IDを表示
  hideUserIds: IDを非表示
  winner: 当選者
  winnerDrawHint: 最も多く正解した参加者から選びます。同点の場合はランダムに選ばれます。
  drawingWinner: 抽選中...
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

.leaderboard-page[data-color-mode='dark'] {
  @apply bg-slate-950 text-slate-50;
}

.leaderboard-page[data-color-mode='dark'] .score-summary,
.leaderboard-page[data-color-mode='dark'] .status-message,
.leaderboard-page[data-color-mode='dark'] .user-id {
  @apply text-slate-300;
}

.leaderboard-page[data-color-mode='dark'] .leaderboard-section,
.leaderboard-page[data-color-mode='dark'] .leaderboard-table {
  @apply border-slate-500 bg-slate-900 text-slate-50;
}

.leaderboard-page[data-color-mode='dark'] .leaderboard-table thead tr,
.leaderboard-page[data-color-mode='dark'] .leaderboard-row {
  @apply border-slate-500;
}

.leaderboard-page[data-color-mode='dark'] .leaderboard-title {
  @apply border-slate-400;
}

</style>
