<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { usePresenterQuiz, type PresenterErrorKind } from '~/composables/usePresenterQuiz'
import { buildPresenterIframeUrls, parsePresenterParameters } from '~/utils/presenter-parameters'

definePageMeta({
  background: false,
  footer: false,
  layout: 'default',
  localeSwitcher: false,
  middleware: 'auth',
})

const route = useRoute()
const { t } = useI18n()
const parameters = computed(() => parsePresenterParameters(route.query))
const iframeUrls = computed(() => buildPresenterIframeUrls(parameters.value))
const presenterStyles = computed<CSSProperties>(() => ({
  '--presenter-foreground-opacity': parameters.value.foregroundOpacity,
  '--presenter-inset-x': `${parameters.value.foregroundInsetX}px`,
  '--presenter-inset-y': `${parameters.value.foregroundInsetY}px`,
  '--presenter-text-scale': parameters.value.textScale,
}))
const {
  currentQuestion,
  currentState,
  errorKind,
  isInitialized,
  isLoading,
  isTransitioning,
  navigate,
  questions,
  step,
} = usePresenterQuiz()
const leaderboardFrame = ref<HTMLIFrameElement>()
let leaderboardWindow: Window | null = null

const errorMessage = computed(() => errorKind.value ? t(errorMessageKey(errorKind.value)) : '')

function errorMessageKey(kind: PresenterErrorKind) {
  return kind === 'load' ? 'loadError' : kind === 'refresh' ? 'refreshError' : 'syncError'
}

function isEditableTarget(target: EventTarget | null) {
  if (!target || typeof target !== 'object') return false
  const element = target as { isContentEditable?: boolean, tagName?: string }
  return element.isContentEditable === true || [
    'INPUT',
    'SELECT',
    'TEXTAREA',
  ].includes(element.tagName ?? '')
}

function handleNavigationKeydown(event: KeyboardEvent) {
  if (event.repeat || isEditableTarget(event.target)) return
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

  event.preventDefault()
  void navigate(event.key === 'ArrowLeft' ? 'previous' : 'next')
}

function detachLeaderboardKeyboard() {
  leaderboardWindow?.removeEventListener('keydown', handleNavigationKeydown)
  leaderboardWindow = null
}

function attachLeaderboardKeyboard() {
  detachLeaderboardKeyboard()
  leaderboardWindow = leaderboardFrame.value?.contentWindow ?? null
  leaderboardWindow?.addEventListener('keydown', handleNavigationKeydown)
}

watch(step, (newStep) => {
  if (newStep?.kind !== 'leaderboard') detachLeaderboardKeyboard()
})

onMounted(() => window.addEventListener('keydown', handleNavigationKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleNavigationKeydown)
  detachLeaderboardKeyboard()
})
</script>

<template>
  <div
    class="presenter-stage"
    :data-color-mode="parameters.colorMode"
    :style="presenterStyles"
  >
    <div
      aria-hidden="true"
      class="emoji-layer"
      :class="parameters.emojiLayer === 'foreground' ? 'is-foreground' : 'is-background'"
      style="pointer-events: none"
    >
      <iframe
        :src="iframeUrls.emojiUrl"
        style="pointer-events: none"
        tabindex="-1"
        title="" />
    </div>

    <main class="presenter-content">
      <section v-if="isLoading && !isInitialized" aria-live="polite" class="state-panel">
        <h1>{{ t('preparing') }}</h1>
        <p>{{ t('loading') }}</p>
      </section>

      <section v-else-if="isInitialized && questions.length === 0" class="state-panel">
        <h1>{{ t('noQuestionsTitle') }}</h1>
        <p>{{ t('noQuestions') }}</p>
      </section>

      <PresenterQuizView
        v-else-if="step?.kind === 'question' && currentQuestion"
        :busy="isTransitioning"
        :current-state="currentState"
        :parameters="parameters"
        :phase="step.phase"
        :question="currentQuestion"
        :question-index="step.questionIndex"
        :questions="questions"
        @navigate="navigate"
      />

      <template v-else-if="step?.kind === 'leaderboard'">
        <iframe
          ref="leaderboardFrame"
          class="leaderboard-frame"
          :src="iframeUrls.leaderboardUrl"
          :title="t('leaderboard')"
          @load="attachLeaderboardKeyboard"
        />
        <nav :aria-label="t('quizNavigation')" class="leaderboard-navigation">
          <button
            :aria-label="t('previous')"
            :disabled="isTransitioning"
            type="button"
            @click="navigate('previous')"
          >
            <Icon aria-hidden="true" name="ph:caret-left" />
          </button>
          <span>{{ t('leaderboard') }}</span>
          <button
            :aria-label="t('next')"
            :disabled="isTransitioning"
            type="button"
            @click="navigate('next')"
          >
            <Icon aria-hidden="true" name="ph:caret-right" />
          </button>
        </nav>
      </template>
    </main>

    <p
      v-if="errorMessage"
      aria-live="polite"
      class="status-banner"
      role="status">
      {{ errorMessage }}
    </p>
  </div>
</template>

<i18n lang="yaml">
en:
  preparing: Preparing live quiz
  loading: Loading questions and presenter state...
  noQuestionsTitle: No active quiz questions
  noQuestions: Enable at least one question in the admin area, then reload this page.
  leaderboard: Leaderboard
  quizNavigation: Quiz navigation
  previous: Previous presenter step
  next: Next presenter step
  loadError: The presenter quiz could not be loaded. Reload the page to try again.
  refreshError: Live results could not be refreshed. The last successful state remains visible.
  syncError: The next presenter step could not be synchronized. Try again.
de:
  preparing: Live-Quiz wird vorbereitet
  loading: Fragen und Presenter-Status werden geladen...
  noQuestionsTitle: Keine aktiven Quiz-Fragen
  noQuestions: Aktiviere mindestens eine Frage im Adminbereich und lade diese Seite neu.
  leaderboard: Bestenliste
  quizNavigation: Quiz-Navigation
  previous: Vorheriger Präsentationsschritt
  next: Nächster Präsentationsschritt
  loadError: Das Presenter-Quiz konnte nicht geladen werden. Lade die Seite erneut.
  refreshError: Live-Ergebnisse konnten nicht aktualisiert werden. Der letzte erfolgreiche Stand bleibt sichtbar.
  syncError: Der nächste Präsentationsschritt konnte nicht synchronisiert werden. Versuche es erneut.
ja:
  preparing: ライブクイズを準備中
  loading: 質問とプレゼンター状態を読み込んでいます...
  noQuestionsTitle: 有効なクイズ質問がありません
  noQuestions: 管理画面で少なくとも1つの質問を有効にして、このページを再読み込みしてください。
  leaderboard: リーダーボード
  quizNavigation: クイズナビゲーション
  previous: 前のプレゼンターステップ
  next: 次のプレゼンターステップ
  loadError: プレゼンタークイズを読み込めませんでした。ページを再読み込みしてください。
  refreshError: ライブ結果を更新できませんでした。最後に成功した状態を表示しています。
  syncError: 次のプレゼンターステップを同期できませんでした。もう一度お試しください。
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.presenter-stage {
  --presenter-answer-rgb: 241 245 249;
  --presenter-border: #e2e8f0;
  --presenter-control: #fff;
  --presenter-copy: #334155;
  --presenter-muted: #64748b;
  --presenter-panel-rgb: 255 255 255;
  --presenter-text: #0f172a;
  @apply relative h-dvh min-h-[480px] w-full overflow-hidden bg-slate-50;
  color: var(--presenter-text);
}

.presenter-stage[data-color-mode='dark'] {
  --presenter-answer-rgb: 30 41 59;
  --presenter-border: #475569;
  --presenter-control: #1e293b;
  --presenter-copy: #cbd5e1;
  --presenter-muted: #cbd5e1;
  --presenter-panel-rgb: 15 23 42;
  --presenter-text: #f8fafc;
  @apply bg-slate-950;
}

.presenter-content {
  @apply relative h-full;
  padding: var(--presenter-inset-y) var(--presenter-inset-x) calc(var(--presenter-inset-y) + 18px);
}

.emoji-layer,
.emoji-layer iframe {
  @apply pointer-events-none absolute inset-0 h-full w-full border-0;
}

.emoji-layer.is-background {
  z-index: 0;
}

.emoji-layer.is-foreground {
  z-index: 20;
}

.state-panel {
  @apply relative z-10 flex h-full flex-col items-center justify-center rounded-3xl border;
  @apply px-8 py-8 text-center shadow-sm;
  background: rgb(var(--presenter-panel-rgb) / calc(.8 * var(--presenter-foreground-opacity)));
  border-color: var(--presenter-border);
}

.state-panel h1 {
  @apply mb-3 text-3xl font-black;
}

.state-panel p {
  @apply max-w-3xl text-base leading-relaxed;
  color: var(--presenter-copy);
}

.leaderboard-frame {
  @apply absolute inset-0 z-10 h-full w-full border-0;
}

.leaderboard-navigation {
  @apply absolute top-2 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1;
  @apply rounded-full border px-1 shadow-sm backdrop-blur-sm;
  background: rgb(var(--presenter-panel-rgb) / .9);
  border-color: var(--presenter-border);
  color: var(--presenter-text);
  font-size: calc(.75rem * var(--presenter-text-scale));
  font-weight: 600;
  letter-spacing: .2em;
  text-transform: uppercase;
}

.leaderboard-navigation button {
  @apply flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent;
  @apply transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50;
  min-height: max(44px, calc(44px * var(--presenter-text-scale)));
  min-width: max(44px, calc(44px * var(--presenter-text-scale)));
}

.leaderboard-navigation button:hover:not(:disabled) {
  @apply bg-slate-950 text-white;
}

.leaderboard-navigation button:focus-visible {
  @apply outline-3 outline-offset-2 outline-blue-600;
}

.status-banner {
  @apply pointer-events-none absolute top-3 right-3 z-50 max-w-sm rounded-[1.25rem];
  @apply border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-950 shadow-lg;
}

@media (max-width: 860px) {
  .presenter-content {
    padding-right: min(var(--presenter-inset-x), 1rem);
    padding-left: min(var(--presenter-inset-x), 1rem);
  }
}
</style>
