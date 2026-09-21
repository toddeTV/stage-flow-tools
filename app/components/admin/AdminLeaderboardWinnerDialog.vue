<script setup lang="ts">
import { pickRandomItem } from '~/utils/pickRandomItem'

type LeaderboardEntry = {
  rank: number
  userId: string
  nickname: string
  correctAnswers: number
}

type WinnerModalPhase = 'ready' | 'drawing' | 'revealed'
type ConfettiModule = { default: typeof import('canvas-confetti') }
type ConfettiInstance = ReturnType<ConfettiModule['default']['create']>

const isOpen = defineModel<boolean>({ required: true })
const props = defineProps<{
  candidates: LeaderboardEntry[]
  colorMode: string
  totalPublishedQuestions: number
  translate: (key: string) => string
}>()

const winnerModalPhase = ref<WinnerModalPhase>('ready')
const selectedWinner = ref<LeaderboardEntry>()
const selectedWinnerTotalPublishedQuestions = ref(0)
const winnerDialog = ref<HTMLDialogElement>()
const winnerConfettiCanvas = ref<HTMLCanvasElement>()
let winnerTimer: ReturnType<typeof setTimeout> | undefined
let confettiModule: Promise<ConfettiModule> | undefined
let winnerConfetti: ConfettiInstance | undefined

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
  if (!confettiModule) {
    confettiModule = import('canvas-confetti').catch((error: unknown) => {
      confettiModule = undefined
      throw error
    })
  }

  return confettiModule
}

function preloadConfetti() {
  void loadConfetti().catch((error: unknown) => {
    logger_error('Failed to preload winner confetti', error)
  })
}

async function celebrateWinner() {
  const canvas = winnerConfettiCanvas.value
  if (!canvas) return

  try {
    const { default: confetti } = await loadConfetti()
    if (!isOpen.value || winnerConfettiCanvas.value !== canvas) return

    clearWinnerConfetti()
    winnerConfetti = confetti.create(canvas, {
      disableForReducedMotion: false,
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

    await Promise.all([
      winnerConfetti({
        ...options,
        angle: 60,
        origin: { x: 0.05, y: 0.7 },
        particleCount: 180,
        spread: 75,
        startVelocity: 60,
      }),
      winnerConfetti({
        ...options,
        angle: 120,
        origin: { x: 0.95, y: 0.7 },
        particleCount: 180,
        spread: 75,
        startVelocity: 60,
      }),
      winnerConfetti({
        ...options,
        angle: 90,
        origin: { x: 0.5, y: 0.65 },
        particleCount: 120,
        spread: 100,
        startVelocity: 45,
      }),
    ])
  }
  catch (error: unknown) {
    logger_error('Failed to display winner confetti', error)
  }
}

function resetWinnerModal() {
  clearWinnerTimer()
  clearWinnerConfetti()
  isOpen.value = false
  winnerModalPhase.value = 'ready'
  selectedWinner.value = undefined
  selectedWinnerTotalPublishedQuestions.value = 0
}

function closeWinnerModal() {
  if (winnerDialog.value?.open) {
    winnerDialog.value.close()
    return
  }

  resetWinnerModal()
}

function startWinnerDraw() {
  if (winnerModalPhase.value !== 'ready') return

  const candidates = [
    ...props.candidates,
  ]
  const totalPublishedQuestionsAtDrawStart = props.totalPublishedQuestions

  winnerModalPhase.value = 'drawing'
  preloadConfetti()
  winnerTimer = setTimeout(() => {
    winnerTimer = undefined
    const winner = pickRandomItem(candidates)

    if (!winner) {
      closeWinnerModal()
      return
    }

    selectedWinner.value = winner
    selectedWinnerTotalPublishedQuestions.value = totalPublishedQuestionsAtDrawStart
    winnerModalPhase.value = 'revealed'
    void celebrateWinner()
  }, 750)
}

onMounted(() => {
  winnerDialog.value?.showModal()
})

onBeforeUnmount(() => {
  clearWinnerTimer()
  clearWinnerConfetti()
})
</script>

<template>
  <dialog
    ref="winnerDialog"
    :aria-busy="winnerModalPhase === 'drawing'"
    :aria-describedby="winnerModalPhase === 'ready' ? 'winner-modal-description' : undefined"
    aria-labelledby="winner-modal-title"
    class="winner-dialog m-auto max-h-[calc(100dvh-2.5rem)] w-[calc(100%-2.5rem)] max-w-md
    border-[3px] border-black bg-white p-6 text-black backdrop:bg-black/50"
    :data-color-mode="colorMode"
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
        {{ translate('winner') }}
      </p>

      <template v-if="winnerModalPhase === 'ready'">
        <h2 id="winner-modal-title" class="mt-2 text-4xl leading-tight font-bold">
          {{ translate('drawWinner') }}
        </h2>

        <div class="mt-6">
          <UiButton @click="startWinnerDraw">
            {{ translate('drawWinner') }}
          </UiButton>
          <p id="winner-modal-description" class="winner-hint mt-3 text-sm text-gray-600">
            {{ translate('winnerDrawHint') }}
          </p>
        </div>
      </template>

      <template v-else-if="winnerModalPhase === 'drawing'">
        <h2 id="winner-modal-title" class="mt-2 text-4xl leading-tight font-bold">
          {{ translate('drawingWinner') }}
        </h2>

        <div
          aria-live="polite"
          class="winner-drawing mt-6 border-[3px] border-black bg-gray-100 p-8 text-center"
          role="status"
        >
          <div
            aria-hidden="true"
            class="mx-auto size-16 animate-spin border-[6px] border-black border-t-gray-300
            motion-reduce:animate-none"
          />
          <p class="mt-4 text-sm font-bold tracking-wide uppercase">
            {{ translate('drawingWinner') }}
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
              {{ translate('rank') }}
            </dt>
            <dd class="winner-stat-value">
              {{ selectedWinner.rank }}
            </dd>
          </div>
          <div class="winner-stat">
            <dt class="winner-stat-label">
              {{ translate('correctAnswers') }}
            </dt>
            <dd class="winner-stat-value">
              {{ selectedWinner.correctAnswers }}
              <span class="winner-total ml-1 text-lg font-normal text-gray-400">
                / {{ selectedWinnerTotalPublishedQuestions }}
              </span>
            </dd>
          </div>
        </dl>
      </template>

      <div class="mt-6 flex justify-end">
        <UiButton variant="secondary" @click="closeWinnerModal">
          {{ translate('close') }}
        </UiButton>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.winner-stat {
  @apply border-2 border-black p-3;
}

.winner-stat-label {
  @apply text-xs font-bold tracking-wide uppercase;
}

.winner-stat-value {
  @apply mt-1 text-2xl font-bold;
}

.winner-dialog[data-color-mode='dark'] {
  @apply border-slate-400 bg-slate-900 text-slate-50;
}

.winner-dialog[data-color-mode='dark'] .winner-stat,
.winner-dialog[data-color-mode='dark'] .winner-drawing {
  @apply border-slate-400 bg-slate-800;
}

.winner-dialog[data-color-mode='dark'] .winner-hint,
.winner-dialog[data-color-mode='dark'] .winner-total {
  @apply text-slate-300;
}
</style>
