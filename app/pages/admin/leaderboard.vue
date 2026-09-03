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
  totalPublishedQuestions: number
  totalQuestionsWithCorrectAnswers: number
}

type WinnerModalPhase = 'ready' | 'drawing' | 'revealed'
type ConfettiModule = { default: typeof import('canvas-confetti') }
type ConfettiInstance = ReturnType<ConfettiModule['default']['create']>

const isLoading = ref(false)
const hasError = ref(false)
const isOver9000Mode = ref(false)
const leaderboard = ref<LeaderboardEntry[]>([])
const totalPublishedQuestions = ref(0)
const totalQuestionsWithCorrectAnswers = ref(0)
const isWinnerModalOpen = ref(false)
const winnerModalPhase = ref<WinnerModalPhase>('ready')
const selectedWinner = ref<LeaderboardEntry>()
const winnerDialog = ref<HTMLDialogElement>()
const winnerConfettiCanvas = ref<HTMLCanvasElement>()
let winnerTimer: ReturnType<typeof setTimeout> | undefined
let confettiModule: Promise<ConfettiModule> | undefined
let winnerConfetti: ConfettiInstance | undefined

const topRankedEntries = computed(() => leaderboard.value.filter(entry => entry.rank === 1))

function toggleOver9000Mode() {
  isOver9000Mode.value = !isOver9000Mode.value
}

function clearWinnerTimer() {
  if (winnerTimer === undefined) return

  clearTimeout(winnerTimer)
  winnerTimer = undefined
}

function clearWinnerConfetti() {
  winnerConfetti?.reset()
  winnerConfetti = undefined
}

function loadConfetti() {
  confettiModule ??= import('canvas-confetti')
  return confettiModule
}

async function celebrateWinner() {
  const canvas = winnerConfettiCanvas.value
  if (!canvas) return

  const { default: confetti } = await loadConfetti()
  if (!isWinnerModalOpen.value || winnerConfettiCanvas.value !== canvas) return

  clearWinnerConfetti()
  winnerConfetti = confetti.create(canvas, {
    disableForReducedMotion: true,
    resize: true,
    useWorker: true,
  })

  const options = {
    colors: [
      '#facc15',
      '#22c55e',
      '#3b82f6',
      '#a855f7',
      '#ec4899',
    ],
    scalar: 1.3,
    ticks: 360,
  }

  void winnerConfetti({
    ...options,
    angle: 60,
    origin: { x: 0.05, y: 0.7 },
    particleCount: 180,
    spread: 75,
    startVelocity: 60,
  })
  void winnerConfetti({
    ...options,
    angle: 120,
    origin: { x: 0.95, y: 0.7 },
    particleCount: 180,
    spread: 75,
    startVelocity: 60,
  })
  void winnerConfetti({
    ...options,
    angle: 90,
    origin: { x: 0.5, y: 0.65 },
    particleCount: 120,
    spread: 100,
    startVelocity: 45,
  })
}

function resetWinnerModal() {
  clearWinnerTimer()
  clearWinnerConfetti()
  isWinnerModalOpen.value = false
  winnerModalPhase.value = 'ready'
  selectedWinner.value = undefined
}

function closeWinnerModal() {
  if (winnerDialog.value?.open) {
    winnerDialog.value.close()
    return
  }

  resetWinnerModal()
}

function openWinnerModal() {
  if (isWinnerModalOpen.value || topRankedEntries.value.length === 0) return

  winnerModalPhase.value = 'ready'
  isWinnerModalOpen.value = true
  nextTick(() => winnerDialog.value?.showModal())
}

function startWinnerDraw() {
  if (winnerModalPhase.value !== 'ready') return

  winnerModalPhase.value = 'drawing'
  void loadConfetti()
  winnerTimer = setTimeout(() => {
    winnerTimer = undefined
    const winner = pickRandomItem(topRankedEntries.value)

    if (!winner) {
      closeWinnerModal()
      return
    }

    selectedWinner.value = winner
    winnerModalPhase.value = 'revealed'
    void celebrateWinner()
  }, 750)
}

/** Fetch leaderboard data from the API. */
async function fetchLeaderboard() {
  closeWinnerModal()
  isLoading.value = true
  hasError.value = false
  try {
    const data = await $fetch<LeaderboardResponse>('/api/results/leaderboard')
    leaderboard.value = data.leaderboard
    totalPublishedQuestions.value = data.totalPublishedQuestions
    totalQuestionsWithCorrectAnswers.value = data.totalQuestionsWithCorrectAnswers
  }
  catch (error: unknown) {
    logger_error('Failed to fetch leaderboard', error)
    hasError.value = true
    leaderboard.value = []
    totalPublishedQuestions.value = 0
    totalQuestionsWithCorrectAnswers.value = 0
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchLeaderboard()
})

onBeforeUnmount(() => {
  clearWinnerTimer()
  clearWinnerConfetti()
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
          @click="openWinnerModal"
        >
          {{ t('drawWinner') }}
        </UiButton>
        <UiButton
          :aria-pressed="isOver9000Mode"
          :disabled="isLoading || leaderboard.length === 0"
          size="small"
          :variant="isOver9000Mode ? 'primary' : 'secondary'"
          @click="toggleOver9000Mode"
        >
          {{ isOver9000Mode ? t('showScores') : t('over9000') }}
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
              {{ isOver9000Mode ? '>9000' : entry.correctAnswers }}
            </td>
          </tr>
        </tbody>
      </table>
    </UiSection>

    <dialog
      v-if="isWinnerModalOpen"
      ref="winnerDialog"
      :aria-busy="winnerModalPhase === 'drawing'"
      :aria-describedby="winnerModalPhase === 'ready' ? 'winner-modal-description' : undefined"
      aria-labelledby="winner-modal-title"
      class="m-auto max-h-[calc(100dvh-2.5rem)] w-[calc(100%-2.5rem)] max-w-md
        border-[3px] border-black bg-white p-6 text-black backdrop:bg-black/50"
      @click.self="closeWinnerModal"
      @close="resetWinnerModal"
    >
      <canvas
        ref="winnerConfettiCanvas"
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 z-10 h-dvh w-dvw"
      />

      <div class="relative z-20">
        <p class="text-sm font-bold tracking-wide uppercase">
          {{ t('winner') }}
        </p>

        <template v-if="winnerModalPhase === 'ready'">
          <h2 id="winner-modal-title" class="mt-2 text-4xl leading-tight font-bold">
            {{ t('drawWinner') }}
          </h2>

          <div class="mt-6">
            <UiButton @click="startWinnerDraw">
              {{ t('drawWinner') }}
            </UiButton>
            <p id="winner-modal-description" class="mt-3 text-sm text-gray-600">
              {{ t('winnerDrawHint') }}
            </p>
          </div>
        </template>

        <template v-else-if="winnerModalPhase === 'drawing'">
          <h2 id="winner-modal-title" class="mt-2 text-4xl leading-tight font-bold">
            {{ t('drawingWinner') }}
          </h2>

          <div aria-live="polite" class="mt-6 border-[3px] border-black bg-gray-100 p-8 text-center" role="status">
            <div
              aria-hidden="true"
              class="mx-auto size-16 animate-spin border-[6px] border-black border-t-gray-300
                motion-reduce:animate-none"
            />
            <p class="mt-4 text-sm font-bold tracking-wide uppercase">
              {{ t('drawingWinner') }}
            </p>
          </div>
        </template>

        <template v-else-if="selectedWinner">
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
                <span class="ml-1 text-lg font-normal text-gray-400">
                  / {{ totalPublishedQuestions }}
                </span>
              </dd>
            </div>
          </dl>
        </template>

        <div class="mt-6 flex justify-end">
          <UiButton variant="secondary" @click="closeWinnerModal">
            {{ t('close') }}
          </UiButton>
        </div>
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
  over9000: 🐉 Over 9000!
  showScores: 🐉 Show scores
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
  winner: Gewinner
  winnerDrawHint: Die Person mit den meisten richtigen Antworten wird gezogen. Bei Gleichstand entscheidet der Zufall.
  drawingWinner: Auslosung läuft...
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
  over9000: 🐉 9000以上！
  showScores: 🐉 得点を表示
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
