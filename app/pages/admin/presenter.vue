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
const presenterRefresh = computed(() => parameters.value.presenterRefresh)
const iframeUrls = computed(() => buildPresenterIframeUrls(parameters.value))
const presenterStyles = computed<CSSProperties>(() => ({
  '--presenter-foreground-opacity': parameters.value.foregroundOpacity,
  '--presenter-inset-x': `${parameters.value.foregroundInsetX}px`,
  '--presenter-inset-y': `${parameters.value.foregroundInsetY}px`,
  '--presenter-stage-scale': parameters.value.stageScale,
  '--presenter-text-scale': parameters.value.textScale,
  backgroundColor: parameters.value.backgroundColor,
}))
const stageStyles = computed<CSSProperties>(() => {
  const inverseSize = `${100 / parameters.value.stageScale}%`

  return {
    height: inverseSize,
    transform: `scale(${parameters.value.stageScale})`,
    transformOrigin: 'top left',
    width: inverseSize,
  }
})
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
} = usePresenterQuiz(presenterRefresh)
const endscreenFrame = ref<HTMLIFrameElement>()
let endscreenWindow: Window | null = null

const endscreenStep = computed(() => step.value?.kind === 'leaderboard' || step.value?.kind === 'recap'
  ? step.value
  : null)
const endscreenUrl = computed(() => endscreenStep.value?.kind === 'recap'
  ? iframeUrls.value.recapUrl
  : iframeUrls.value.leaderboardUrl)
const endscreenTitle = computed(() => t(endscreenStep.value?.kind === 'recap' ? 'recap' : 'leaderboard'))

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

function detachEndscreenKeyboard() {
  endscreenWindow?.removeEventListener('keydown', handleNavigationKeydown)
  endscreenWindow = null
}

function attachEndscreenKeyboard() {
  detachEndscreenKeyboard()
  endscreenWindow = endscreenFrame.value?.contentWindow ?? null
  endscreenWindow?.addEventListener('keydown', handleNavigationKeydown)
}

watch(endscreenStep, (newStep) => {
  if (!newStep) detachEndscreenKeyboard()
})

onMounted(() => window.addEventListener('keydown', handleNavigationKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleNavigationKeydown)
  detachEndscreenKeyboard()
})
</script>

<template>
  <div
    class="presenter-viewport"
    :data-color-mode="parameters.colorMode"
    :style="presenterStyles"
  >
    <div class="presenter-stage" :style="stageStyles">
      <div
        v-if="parameters.emojiLayer !== 'none'"
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

        <template v-else-if="endscreenStep">
          <iframe
            ref="endscreenFrame"
            class="endscreen-frame"
            :src="endscreenUrl"
            :title="endscreenTitle"
            @load="attachEndscreenKeyboard"
          />
          <nav :aria-label="t('quizNavigation')" class="endscreen-navigation">
            <button
              :aria-label="t('previous')"
              :disabled="isTransitioning"
              type="button"
              @click="navigate('previous')"
            >
              <Icon aria-hidden="true" name="ph:caret-left" />
            </button>
            <span>{{ endscreenTitle }}</span>
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
  </div>
</template>

<i18n lang="yaml">
en:
  preparing: Preparing live quiz
  loading: Loading questions and presenter state...
  noQuestionsTitle: No active quiz questions
  noQuestions: Enable at least one question in the admin area, then reload this page.
  leaderboard: Leaderboard
  recap: Quiz recap
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
  recap: Quiz-Rückblick
  quizNavigation: Quiz-Navigation
  previous: Vorheriger Präsentationsschritt
  next: Nächster Präsentationsschritt
  loadError: Das Presenter-Quiz konnte nicht geladen werden. Lade die Seite erneut.
  refreshError: Live-Ergebnisse konnten nicht aktualisiert werden. Der letzte erfolgreiche Stand bleibt sichtbar.
  syncError: Der nächste Präsentationsschritt konnte nicht synchronisiert werden. Versuche es erneut.
fr:
  preparing: Préparation du quiz en direct
  loading: Chargement des questions et de l'état du présentateur...
  noQuestionsTitle: Aucune question de quiz active
  noQuestions: Activez au moins une question dans l'administration, puis rechargez cette page.
  leaderboard: Classement
  recap: Récapitulatif du quiz
  quizNavigation: Navigation du quiz
  previous: Étape précédente de la présentation
  next: Étape suivante de la présentation
  loadError: Impossible de charger le quiz de présentation. Rechargez la page pour réessayer.
  refreshError: Impossible d'actualiser les résultats en direct. Le dernier état chargé reste visible.
  syncError: Impossible de synchroniser l'étape suivante de la présentation. Réessayez.
ja:
  preparing: ライブクイズを準備中
  loading: 質問とプレゼンター状態を読み込んでいます...
  noQuestionsTitle: 有効なクイズ質問がありません
  noQuestions: 管理画面で少なくとも1つの質問を有効にして、このページを再読み込みしてください。
  leaderboard: リーダーボード
  recap: クイズのまとめ
  quizNavigation: クイズナビゲーション
  previous: 前のプレゼンターステップ
  next: 次のプレゼンターステップ
  loadError: プレゼンタークイズを読み込めませんでした。ページを再読み込みしてください。
  refreshError: ライブ結果を更新できませんでした。最後に成功した状態を表示しています。
  syncError: 次のプレゼンターステップを同期できませんでした。もう一度お試しください。
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.presenter-viewport {
  --presenter-answer-rgb: 241 245 249;
  --presenter-border: #e2e8f0;
  --presenter-correct-marker-background: #fff;
  --presenter-correct-marker-border: #94a3b8;
  --presenter-correct-marker-color: #15803d;
  --presenter-control: #fff;
  --presenter-copy: #334155;
  --presenter-muted: #64748b;
  --presenter-panel-rgb: 255 255 255;
  --presenter-text: #0f172a;
  @apply relative h-dvh w-full overflow-hidden bg-slate-50;
  color: var(--presenter-text);
}

.presenter-viewport[data-color-mode='dark'] {
  --presenter-answer-rgb: 30 41 59;
  --presenter-border: #475569;
  --presenter-correct-marker-background: #020617;
  --presenter-correct-marker-border: #64748b;
  --presenter-correct-marker-color: #86efac;
  --presenter-control: #1e293b;
  --presenter-copy: #cbd5e1;
  --presenter-muted: #cbd5e1;
  --presenter-panel-rgb: 15 23 42;
  --presenter-text: #f8fafc;
  @apply bg-slate-950;
}

.presenter-stage {
  @apply relative overflow-hidden;
  container-name: presenter-stage;
  container-type: inline-size;
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
  z-index: 60;
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

.endscreen-frame {
  @apply absolute inset-0 z-10 h-full w-full border-0;
}

.endscreen-navigation {
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

.endscreen-navigation button {
  @apply flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent;
  @apply transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50;
  min-height: max(44px, calc(44px * var(--presenter-text-scale)));
  min-width: max(44px, calc(44px * var(--presenter-text-scale)));
}

.endscreen-navigation button:hover:not(:disabled) {
  @apply bg-slate-950 text-white;
}

.endscreen-navigation button:focus-visible {
  @apply outline-3 outline-offset-2 outline-blue-600;
}

.status-banner {
  @apply pointer-events-none absolute top-3 right-3 z-50 max-w-sm rounded-[1.25rem];
  @apply border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-950 shadow-lg;
}

@container presenter-stage (max-width: 860px) {
  .presenter-content {
    padding-right: min(var(--presenter-inset-x), 1rem);
    padding-left: min(var(--presenter-inset-x), 1rem);
  }
}
</style>
