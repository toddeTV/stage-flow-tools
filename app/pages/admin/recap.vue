<script setup lang="ts">
import { useAdminRecap } from '~/composables/useAdminRecap'
import { useDisplayParameters } from '~/composables/useDisplayParameters'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const {
  backgroundStyles,
  colorMode,
  coreViewStyles,
  isCoreView,
  refreshIntervalMs,
} = useDisplayParameters()
const {
  accuracy,
  fetchRecap,
  hasError,
  hasLoadedRecap,
  hasRefreshError,
  highlightDescription,
  highlightMetric,
  highlightTitle,
  isLoading,
  localizedText,
  recap,
  t,
  visibleHighlights,
} = useAdminRecap(refreshIntervalMs)
</script>

<template>
  <div class="recap-page flex-1" :data-color-mode="colorMode" :style="backgroundStyles">
    <div
      class="recap-content"
      :class="{ 'mx-auto max-w-5xl p-5': !isCoreView }"
      :style="coreViewStyles"
    >
      <AdminBackLink v-if="!isCoreView" />
      <UiPageTitle v-if="!isCoreView" class="recap-title">
        {{ t('title') }}
      </UiPageTitle>

      <div v-if="!isCoreView" class="mb-5 flex justify-end">
        <UiButton
          class="inline-flex items-center gap-2"
          :disabled="isLoading"
          size="small"
          variant="secondary"
          @click="fetchRecap"
        >
          <Icon aria-hidden="true" class="size-4" name="ph:arrow-clockwise" />
          {{ t('refresh') }}
        </UiButton>
      </div>

      <p
        v-if="isLoading && !hasLoadedRecap"
        aria-live="polite"
        class="status-message"
        role="status"
      >
        {{ t('loading') }}
      </p>

      <div v-else-if="hasError" class="status-message" role="status">
        <p aria-live="assertive">{{ t('error') }}</p>
        <UiButton class="mt-4" :disabled="isLoading" @click="fetchRecap">
          {{ t('retry') }}
        </UiButton>
      </div>

      <section v-else-if="recap" :aria-label="t('title')" class="recap-surface border-[3px] border-black bg-white">
        <section class="recap-hero bg-black p-6 text-white sm:p-10">
          <h1 v-if="isCoreView" class="text-sm font-bold tracking-[0.18em] uppercase">{{ t('title') }}</h1>
          <p v-else class="text-sm font-bold tracking-[0.18em] uppercase">{{ t('complete') }}</p>
          <p class="mt-6 text-sm font-bold tracking-[0.18em] uppercase">{{ t('overallAccuracy') }}</p>
          <p class="mt-2 text-6xl leading-none font-bold tabular-nums sm:text-8xl">{{ accuracy }}</p>
          <p class="mt-4 max-w-xl text-base text-gray-300 sm:text-xl">
            {{ t('correctOf', { correct: recap.totals.correctAnswers, total: recap.totals.scoredAnswers }) }}
          </p>
        </section>

        <div v-if="hasRefreshError" class="recap-stale-message border-b-[3px] border-black bg-gray-100 p-5">
          <p aria-live="polite" role="status">
            {{ t('refreshError') }}
          </p>
          <UiButton
            class="mt-3"
            :disabled="isLoading"
            size="small"
            variant="secondary"
            @click="fetchRecap"
          >
            {{ t('retry') }}
          </UiButton>
        </div>

        <dl class="grid grid-cols-1 border-b-[3px] border-black sm:grid-cols-3">
          <div class="recap-total border-b-[3px] border-black p-5 sm:border-r-[3px] sm:border-b-0">
            <dt>{{ t('publishedQuestions') }}</dt>
            <dd>{{ recap.totals.publishedQuestions }}</dd>
          </div>
          <div class="recap-total border-b-[3px] border-black p-5 sm:border-r-[3px] sm:border-b-0">
            <dt>{{ t('answers') }}</dt>
            <dd>{{ recap.totals.answers }}</dd>
          </div>
          <div class="recap-total p-5">
            <dt>{{ t('participants') }}</dt>
            <dd>{{ recap.totals.participants }}</dd>
          </div>
        </dl>

        <p
          v-if="recap.totals.answers === 0"
          aria-live="polite"
          class="empty-message"
          role="status"
        >
          {{ t('empty') }}
        </p>

        <section v-if="visibleHighlights.length" :aria-label="t('highlights')" class="p-5 sm:p-8">
          <h2 class="mb-5 text-xl font-bold tracking-wide uppercase sm:text-2xl">{{ t('highlights') }}</h2>
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <article
              v-for="highlight in visibleHighlights"
              :key="highlight.kind"
              class="recap-card min-w-0 border-[3px] border-black p-5"
            >
              <p class="text-sm font-bold tracking-wide uppercase">{{ highlightTitle(highlight.kind) }}</p>
              <h3 class="mt-3 text-2xl leading-tight font-bold sm:text-3xl">
                <QuizMarkdownText :text="localizedText(highlight.question.text)" />
              </h3>
              <p class="mt-5 text-4xl leading-none font-bold tabular-nums">{{ highlightMetric(highlight) }}</p>
              <p class="mt-2 text-sm text-gray-600">{{ highlightDescription(highlight) }}</p>
              <dl
                v-if="highlight.kind === 'closest-call'"
                class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <div
                  v-for="option in highlight.leadingOptions"
                  :key="option.text.en"
                  class="min-w-0 border-2 border-black p-3"
                >
                  <dt class="text-sm leading-snug">
                    <QuizMarkdownText :text="localizedText(option.text)" />
                  </dt>
                  <dd class="mt-1 text-2xl font-bold tabular-nums">{{ option.count }}</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
      </section>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  title: Quiz Recap
  complete: Quiz complete
  refresh: Refresh
  retry: Try again
  loading: Loading quiz recap...
  error: Quiz recap could not be loaded. Please try again.
  refreshError: Quiz recap could not be refreshed. The last successful data remains visible.
  empty: No answers submitted yet.
  overallAccuracy: Overall accuracy
  correctOf: "{correct} correct out of {total} answers"
  publishedQuestions: Published questions
  answers: Answers
  participants: Participants
  highlights: Highlights
  answersCount: "{count} answers"
  highlight:
    best-known: Crowd wisdom
    hardest: Final boss
    most-answered: Crowd magnet
    closest-call: Photo finish
de:
  title: Quiz-Rückblick
  complete: Quiz abgeschlossen
  refresh: Aktualisieren
  retry: Erneut versuchen
  loading: Quiz-Rückblick wird geladen...
  error: Der Quiz-Rückblick konnte nicht geladen werden. Bitte erneut versuchen.
  refreshError: Der Quiz-Rückblick konnte nicht aktualisiert werden. Der letzte erfolgreiche Stand bleibt sichtbar.
  empty: Noch keine Antworten eingereicht.
  overallAccuracy: Gesamttrefferquote
  correctOf: "{correct} richtig von {total} Antworten"
  publishedQuestions: Veröffentlichte Fragen
  answers: Antworten
  participants: Teilnehmende
  highlights: Highlights
  answersCount: "{count} Antworten"
  highlight:
    best-known: Publikumswissen
    hardest: Endgegner
    most-answered: Publikumsmagnet
    closest-call: Foto-Finish
fr:
  title: Récapitulatif du quiz
  complete: Quiz terminé
  refresh: Actualiser
  retry: Réessayer
  loading: Chargement du récapitulatif du quiz...
  error: Impossible de charger le récapitulatif du quiz. Réessayez.
  refreshError: Impossible d'actualiser le récapitulatif du quiz. Les dernières données chargées restent visibles.
  empty: Aucune réponse soumise pour l'instant.
  overallAccuracy: Taux de bonnes réponses
  correctOf: "{correct} bonnes réponses sur {total}"
  publishedQuestions: Questions publiées
  answers: Réponses
  participants: Participants
  highlights: Temps forts
  answersCount: "{count} réponses"
  highlight:
    best-known: Sagesse du public
    hardest: Boss final
    most-answered: Favori du public
    closest-call: Photo-finish
ja:
  title: クイズの振り返り
  complete: クイズ終了
  refresh: 更新
  retry: もう一度試す
  loading: クイズの振り返りを読み込んでいます...
  error: クイズの振り返りを読み込めませんでした。もう一度試してください。
  refreshError: クイズの振り返りを更新できませんでした。最後に成功したデータを表示しています。
  empty: まだ回答がありません。
  overallAccuracy: 全体の正答率
  correctOf: "{total}回答中{correct}正解"
  publishedQuestions: 公開済みの質問
  answers: 回答
  participants: 参加者
  highlights: ハイライト
  answersCount: "{count}回答"
  highlight:
    best-known: 会場の知恵
    hardest: ラスボス
    most-answered: 人気者
    closest-call: 写真判定
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.status-message,
.empty-message {
  @apply py-10 text-center text-lg tracking-wide text-gray-500;
}

.recap-total dt {
  @apply text-sm font-bold tracking-wide uppercase;
}

.recap-total dd {
  @apply mt-2 text-4xl leading-none font-bold tabular-nums;
}

.recap-page[data-color-mode='dark'] {
  @apply bg-slate-950 text-slate-50;
}

.recap-page[data-color-mode='dark'] .recap-surface,
.recap-page[data-color-mode='dark'] .recap-card {
  @apply border-slate-400 bg-slate-900;
}

.recap-page[data-color-mode='dark'] .recap-total {
  @apply border-slate-400;
}

.recap-page[data-color-mode='dark'] .recap-stale-message {
  @apply border-slate-400 bg-slate-800 text-slate-50;
}

.recap-page[data-color-mode='dark'] .recap-card div {
  @apply border-slate-400;
}

.recap-page[data-color-mode='dark'] .recap-title {
  @apply border-slate-400;
}

.recap-page[data-color-mode='dark'] .status-message,
.recap-page[data-color-mode='dark'] .empty-message {
  @apply text-slate-300;
}

.recap-page[data-color-mode='dark'] .recap-card p.text-gray-600 {
  @apply text-slate-300;
}
</style>
