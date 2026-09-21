<script setup lang="ts">
import type { PresenterQuizAnswer } from '~/components/presenter/presenter-quiz'

const props = defineProps<{
  answers: PresenterQuizAnswer[]
  busy: boolean
  hasRevealNote: boolean
  isReveal: boolean
  questionCount: number
  questionIndex: number
  questionTitle: string
}>()

const emit = defineEmits<{
  navigate: [direction: 'next' | 'previous']
  openNote: []
}>()

const { t } = useI18n()

function answerStyle(answer: PresenterQuizAnswer) {
  return props.isReveal ? { '--presenter-answer-accent': answer.color } : undefined
}
</script>

<template>
  <section class="question-panel">
    <div class="eyebrow-row">
      <div aria-label="Quiz navigation" class="question-navigation">
        <button
          :aria-label="t('previous')"
          class="navigation-button"
          :disabled="props.busy"
          type="button"
          @click="emit('navigate', 'previous')"
        >
          <Icon aria-hidden="true" name="ph:caret-left" />
        </button>
        <span class="eyebrow question-progress">
          {{ t('questionProgress', { current: props.questionIndex + 1, total: props.questionCount }) }}
        </span>
        <button
          :aria-label="t('next')"
          class="navigation-button"
          :disabled="props.busy"
          type="button"
          @click="emit('navigate', 'next')"
        >
          <Icon aria-hidden="true" name="ph:caret-right" />
        </button>
      </div>
      <span class="phase-pill" :class="props.isReveal ? 'is-reveal' : 'is-open'">
        {{ props.isReveal ? t('revealed') : t('open') }}
      </span>
    </div>

    <div class="question-heading-row">
      <h1><QuizMarkdownText mode="inline" :text="props.questionTitle" /></h1>
      <div class="note-trigger-slot">
        <button
          v-if="props.hasRevealNote"
          :aria-label="t('openNote')"
          class="note-trigger"
          type="button"
          @click="emit('openNote')"
        >
          <Icon aria-hidden="true" name="ph:note" />
        </button>
      </div>
    </div>

    <ol class="answer-list">
      <li
        v-for="answer in props.answers"
        :key="answer.id"
        class="answer-card"
        :class="props.isReveal ? 'reveal' : 'open'"
        :style="answerStyle(answer)"
      >
        <span
          v-if="props.isReveal && answer.isCorrect"
          class="absolute top-1/2 -left-5.5 z-10 flex size-7 -translate-y-1/2 items-center justify-center
            rounded-md border border-[var(--presenter-correct-marker-border)]
            bg-[var(--presenter-correct-marker-background)] text-[var(--presenter-correct-marker-color)] shadow-sm"
        >
          <Icon aria-hidden="true" class="size-5 stroke-current stroke-[1px]" name="ph:check-fat" />
        </span>
        <div class="answer-main-row">
          <QuizMarkdownText class="answer-label" mode="inline" :text="answer.label" />
          <span
            v-if="answer.emoji && !answer.isCorrect"
            class="answer-emoji"
            :class="{ 'is-hidden': !props.isReveal }"
          >{{ answer.emoji }}</span>
        </div>
        <div class="answer-stats" :class="{ 'is-hidden': !props.isReveal }">
          <span>{{ t('answerStats', { count: answer.count, percent: answer.percent }) }}</span>
        </div>
        <span v-if="props.isReveal && answer.isCorrect" class="sr-only">{{ t('correctAnswer') }}</span>
      </li>
    </ol>
  </section>
</template>

<i18n lang="yaml">
en:
  previous: Previous presenter step
  next: Next presenter step
  questionProgress: "Question {current} / {total}"
  revealed: Revealed + locked
  open: Open for votes
  openNote: Open discussion note
  answerStats: "{percent}% ({count} votes)"
  correctAnswer: Correct answer
de:
  previous: Vorheriger Präsentationsschritt
  next: Nächster Präsentationsschritt
  questionProgress: "Frage {current} / {total}"
  revealed: Aufgedeckt + gesperrt
  open: Offen für Antworten
  openNote: Diskussionsnotiz öffnen
  answerStats: "{percent}% ({count} Stimmen)"
  correctAnswer: Richtige Antwort
fr:
  previous: Étape précédente de la présentation
  next: Étape suivante de la présentation
  questionProgress: "Question {current} / {total}"
  revealed: Révélée + verrouillée
  open: Ouverte aux votes
  openNote: Ouvrir la note de discussion
  answerStats: "{percent}% ({count} votes)"
  correctAnswer: Bonne réponse
ja:
  previous: 前のプレゼンターステップ
  next: 次のプレゼンターステップ
  questionProgress: "質問 {current} / {total}"
  revealed: 公開済み・ロック済み
  open: 回答受付中
  openNote: ディスカッションノートを開く
  answerStats: "{percent}%（{count}票）"
  correctAnswer: 正解
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.question-panel {
  @apply flex h-full min-h-0 flex-col rounded-[2rem] border px-5 py-5 shadow-sm;
  background: rgb(var(--presenter-panel-rgb) / calc(.6 * var(--presenter-foreground-opacity)));
  border-color: var(--presenter-border);
}

.eyebrow-row,
.answer-main-row {
  @apply flex items-center justify-between gap-3;
}

.eyebrow-row {
  @apply mb-3;
}

.eyebrow {
  @apply font-semibold uppercase tracking-[0.28em];
  color: var(--presenter-muted);
  font-size: .75em;
}

.question-navigation {
  @apply relative z-40 flex items-center gap-1;
}

.question-progress {
  @apply min-w-max text-center;
}

.navigation-button,
.note-trigger {
  @apply flex cursor-pointer items-center justify-center rounded-full border transition-colors duration-200;
  @apply disabled:cursor-not-allowed disabled:opacity-50;
  min-height: max(44px, 2.75em);
  min-width: max(44px, 2.75em);
  background: var(--presenter-control);
  border-color: var(--presenter-border);
  color: var(--presenter-text);
}

.navigation-button:hover:not(:disabled),
.note-trigger:hover {
  @apply bg-slate-950 text-white;
}

.navigation-button:focus-visible,
.note-trigger:focus-visible {
  @apply outline-3 outline-offset-2 outline-blue-600;
}

.phase-pill {
  @apply rounded-full px-3 py-1.5 font-bold uppercase tracking-[0.18em];
  font-size: .65em;
}

.phase-pill.is-open {
  @apply bg-emerald-100 text-emerald-800;
}

.phase-pill.is-reveal {
  @apply bg-amber-100 text-amber-800;
}

.question-heading-row {
  @apply mb-3 grid grid-cols-[minmax(0,1fr)_2.75em] items-start gap-2;
}

.question-heading-row h1 {
  @apply min-w-0 leading-tight font-black;
  font-size: 2em;
}

.note-trigger-slot {
  @apply flex items-start justify-end;
  min-height: max(44px, 2.75em);
}

.answer-list {
  @apply -ml-6 m-0 flex flex-1 list-none flex-col gap-1.5 overflow-x-hidden overflow-y-auto p-0 pr-1 pl-6;
}

.answer-card {
  @apply relative rounded-[1rem] border px-3 py-2 transition-colors duration-200;
  background: rgb(var(--presenter-answer-rgb) / calc(.8 * var(--presenter-foreground-opacity)));
  border-color: var(--presenter-border);
}

.answer-card.reveal {
  background: linear-gradient(
    to right,
    rgb(var(--presenter-answer-rgb) / calc(.8 * var(--presenter-foreground-opacity))) 0 90%,
    var(--presenter-answer-accent) 90% 100%
  );
  padding-right: calc(10% + .75rem);
}

.answer-label {
  @apply min-w-0 flex-1 leading-tight font-semibold;
  font-size: .95em;
}

.answer-emoji {
  font-size: 1.125em;
  line-height: 1;
}

.answer-emoji.is-hidden,
.answer-stats.is-hidden {
  @apply invisible;
}

.answer-stats {
  @apply mt-1 flex min-h-[0.8rem] items-center font-semibold uppercase tracking-[0.14em];
  color: var(--presenter-muted);
  font-size: .58em;
}

@container presenter-stage (max-width: 860px) {
  .question-heading-row h1 {
    font-size: 1.75em;
  }

  .answer-label {
    font-size: .875em;
  }
}
</style>
