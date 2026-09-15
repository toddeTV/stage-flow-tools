<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PresenterCurrentState, Question } from '~/types'
import type { PresenterParameters } from '~/utils/presenter-parameters'
import type { PresenterQuizPhase } from '~/utils/presenter-quiz-state'

interface DisplayAnswer {
  color: string
  count: number
  emoji: string
  id: string
  label: string
  percent: number
}

interface LocaleOption {
  code: string
  label: string
}

const props = defineProps<{
  busy: boolean
  currentState: PresenterCurrentState | null
  parameters: PresenterParameters
  phase: PresenterQuizPhase
  question: Question
  questionIndex: number
  questions: Question[]
}>()

const emit = defineEmits<{
  navigate: [direction: 'next' | 'previous']
}>()

const chartColors = [
  '#0F766E',
  '#2563EB',
  '#EA580C',
  '#7C3AED',
  '#DC2626',
  '#0891B2',
  '#16A34A',
  '#BE123C',
  '#4F46E5',
  '#A16207',
]
const languageStorageKey = 'stage-flow-tools-quiz-language'
const { t } = useI18n()
const isNoteModalOpen = ref(false)
const noteDialog = ref<HTMLDialogElement>()
const selectedLanguage = ref('')

function normalizeLocaleCode(locale?: string | null) {
  return locale?.trim().toLowerCase() || undefined
}

function localizedText(value: Record<string, string> | undefined, locale: string) {
  if (!value) return ''
  const normalized = normalizeLocaleCode(locale)
  const base = normalized?.split('-')[0]
  return (normalized && value[normalized])
    || (base && value[base])
    || value.en
    || Object.values(value).find(Boolean)
    || ''
}

function collectLocales(value?: Record<string, string>) {
  return Object.entries(value ?? {})
    .filter(([
      , text,
    ]) => Boolean(text))
    .map(([
      locale,
    ]) => normalizeLocaleCode(locale))
    .filter((locale): locale is string => Boolean(locale))
}

function localeLabel(locale: string) {
  try {
    const baseLocale = locale.split('-')[0] ?? locale
    const displayName = new Intl.DisplayNames([
      'en',
    ], { type: 'language' }).of(baseLocale)
    return displayName ? `${displayName} (${locale.toUpperCase()})` : locale.toUpperCase()
  }
  catch {
    return locale.toUpperCase()
  }
}

function storedLanguage() {
  try {
    return normalizeLocaleCode(window.localStorage.getItem(languageStorageKey))
  }
  catch {
    return undefined
  }
}

function availableCandidate(candidate: string | undefined, languages: string[]) {
  if (!candidate) return undefined
  if (languages.includes(candidate)) return candidate
  const base = candidate.split('-')[0] ?? candidate
  return languages.includes(base) ? base : undefined
}

const availableLanguages = computed<LocaleOption[]>(() => {
  const locales = new Set<string>()
  props.questions.forEach((question) => {
    collectLocales(question.question_text).forEach(locale => locales.add(locale))
    collectLocales(question.note).forEach(locale => locales.add(locale))
    question.answer_options.forEach(option => collectLocales(option.text).forEach(locale => locales.add(locale)))
  })
  if (locales.size === 0) locales.add('en')
  return [
    ...locales,
  ].sort().map(code => ({ code, label: localeLabel(code) }))
})

const currentQuestionMatches = computed(() => props.currentState?.currentQuestion?.key === props.question.key)
const liveAnswers = computed(() => currentQuestionMatches.value
  ? props.currentState?.currentQuestion?.answer_options ?? []
  : [])
const displayAnswers = computed<DisplayAnswer[]>(() => props.question.answer_options.map((option, index) => ({
  color: chartColors[index % chartColors.length]!,
  count: liveAnswers.value[index]?.count ?? 0,
  emoji: option.emoji ?? liveAnswers.value[index]?.emoji ?? '',
  id: `${props.question.key}-${index}`,
  label: localizedText(option.text, selectedLanguage.value),
  percent: liveAnswers.value[index]?.percent ?? 0,
})))
const totalVotes = computed(() => displayAnswers.value.reduce((sum, answer) => sum + answer.count, 0))
const chartGradient = computed(() => {
  if (totalVotes.value <= 0) return 'conic-gradient(#D9E0E8 0deg 360deg)'
  let offset = 0
  const segments = displayAnswers.value.filter(answer => answer.count > 0).map((answer) => {
    const start = (offset / totalVotes.value) * 360
    offset += answer.count
    return `${answer.color} ${start}deg ${(offset / totalVotes.value) * 360}deg`
  })
  return `conic-gradient(${segments.join(', ')})`
})
const questionTitle = computed(() => localizedText(props.question.question_text, selectedLanguage.value))
const noteText = computed(() => localizedText(props.question.note, selectedLanguage.value))
const isReveal = computed(() => props.phase === 'reveal')
const hasRevealNote = computed(() => isReveal.value && Boolean(noteText.value))
const receivedAnswers = computed(() => currentQuestionMatches.value ? props.currentState?.receivedAnswers ?? 0 : 0)
const participation = computed(() => currentQuestionMatches.value ? props.currentState?.receivedAnswersPercent ?? 0 : 0)
const totalUsers = computed(() => props.currentState?.totalUsers ?? 0)
const chartSummary = computed(() => displayAnswers.value
  .map(answer => `${answer.label}: ${answer.count} (${answer.percent}%)`)
  .join(', '))

function answerStyle(answer: DisplayAnswer) {
  return isReveal.value ? { borderColor: answer.color, borderWidth: '3px' } : undefined
}

async function openNoteModal() {
  if (!hasRevealNote.value) return
  isNoteModalOpen.value = true
  await nextTick()
  noteDialog.value?.showModal()
}

function closeNoteModal() {
  noteDialog.value?.close()
  isNoteModalOpen.value = false
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

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isNoteModalOpen.value) {
    event.preventDefault()
    closeNoteModal()
    return
  }
  if (isEditableTarget(event.target)) return
  if ((event.code === 'NumpadAdd' || event.key.toLowerCase() === 'n') && hasRevealNote.value) {
    event.preventDefault()
    void openNoteModal()
  }
}

watch(availableLanguages, (options) => {
  const languages = options.map(option => option.code)
  if (availableCandidate(selectedLanguage.value, languages)) return
  const preferred = [
    normalizeLocaleCode(props.parameters.language),
    storedLanguage(),
    normalizeLocaleCode(navigator.language),
    'en',
  ].map(candidate => availableCandidate(candidate, languages)).find(Boolean)
  selectedLanguage.value = preferred ?? languages[0] ?? 'en'
}, { immediate: true })

watch(selectedLanguage, (language) => {
  try {
    window.localStorage.setItem(languageStorageKey, language)
  }
  catch {
    // Restricted iframe storage must not block the presenter.
  }
})

watch([
  isReveal,
  noteText,
], ([
  reveal,
  note,
]) => {
  if (!reveal || !note) closeNoteModal()
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="presenter-quiz-view">
    <div class="quiz-layout">
      <section class="question-panel">
        <div class="eyebrow-row">
          <div aria-label="Quiz navigation" class="question-navigation">
            <button
              :aria-label="t('previous')"
              class="navigation-button"
              :disabled="busy"
              type="button"
              @click="emit('navigate', 'previous')"
            >
              <Icon aria-hidden="true" name="ph:caret-left" />
            </button>
            <span class="eyebrow question-progress">
              {{ t('questionProgress', { current: questionIndex + 1, total: questions.length }) }}
            </span>
            <button
              :aria-label="t('next')"
              class="navigation-button"
              :disabled="busy"
              type="button"
              @click="emit('navigate', 'next')"
            >
              <Icon aria-hidden="true" name="ph:caret-right" />
            </button>
          </div>
          <span class="phase-pill" :class="isReveal ? 'is-reveal' : 'is-open'">
            {{ isReveal ? t('revealed') : t('open') }}
          </span>
        </div>

        <div class="question-heading-row">
          <h1>{{ questionTitle }}</h1>
          <div class="note-trigger-slot">
            <button
              v-if="hasRevealNote"
              :aria-label="t('openNote')"
              class="note-trigger"
              type="button"
              @click="openNoteModal"
            >
              <Icon aria-hidden="true" name="ph:note" />
            </button>
          </div>
        </div>

        <ol class="answer-list">
          <li
            v-for="answer in displayAnswers"
            :key="answer.id"
            class="answer-card"
            :class="isReveal ? 'reveal' : 'open'"
            :style="answerStyle(answer)"
          >
            <div class="answer-main-row">
              <span class="answer-label">{{ answer.label }}</span>
              <span class="answer-emoji" :class="{ 'is-hidden': !isReveal }">{{ answer.emoji }}</span>
            </div>
            <div class="answer-stats" :class="{ 'is-hidden': !isReveal }">
              <span>{{ t('votes', { count: answer.count }) }}</span>
              <span>{{ answer.percent }}%</span>
            </div>
          </li>
        </ol>
      </section>

      <aside class="results-panel">
        <div class="result-card">
          <div class="chart-card-header">
            <span class="eyebrow">{{ t('liveDistribution') }}</span>
            <span class="chart-status">{{ currentQuestionMatches ? t('live') : t('syncing') }}</span>
          </div>

          <div class="chart-shell">
            <div
              :aria-label="chartSummary"
              class="chart-donut"
              role="img"
              :style="{ background: chartGradient }"
            >
              <div class="chart-center">
                <strong>{{ receivedAnswers }}</strong>
                <span>{{ receivedAnswers ? t('votesShort') : t('waiting') }}</span>
              </div>
            </div>
          </div>

          <dl class="stats-grid">
            <div><dt>{{ t('votesReceived') }}</dt><dd>{{ receivedAnswers }}</dd></div>
            <div><dt>{{ t('participation') }}</dt><dd>{{ participation }}%</dd></div>
            <div><dt>{{ t('audiencePresent') }}</dt><dd>{{ totalUsers }}</dd></div>
            <div><dt>{{ t('questionState') }}</dt><dd>{{ isReveal ? t('locked') : t('openShort') }}</dd></div>
          </dl>
        </div>
      </aside>
    </div>

    <div v-if="availableLanguages.length" class="language-picker">
      <label for="presenter-quiz-language">{{ t('language') }}</label>
      <select id="presenter-quiz-language" v-model="selectedLanguage">
        <option v-for="language in availableLanguages" :key="language.code" :value="language.code">
          {{ language.label }}
        </option>
      </select>
    </div>

    <dialog
      v-if="isNoteModalOpen && noteText"
      ref="noteDialog"
      aria-labelledby="presenter-note-title"
      class="note-modal"
      :style="{
        transform: `scale(${parameters.stageScale})`,
        transformOrigin: 'center',
      }"
      @click.self="closeNoteModal"
      @close="isNoteModalOpen = false"
    >
      <div class="note-modal-header">
        <div>
          <span class="note-title">{{ t('discussionNote') }}</span>
          <h2 id="presenter-note-title">{{ questionTitle }}</h2>
        </div>
        <button
          :aria-label="t('closeNote')"
          class="note-modal-close"
          type="button"
          @click="closeNoteModal">
          <Icon aria-hidden="true" name="ph:x" />
        </button>
      </div>
      <p>{{ noteText }}</p>
    </dialog>
  </div>
</template>

<i18n lang="yaml">
en:
  previous: Previous presenter step
  next: Next presenter step
  questionProgress: "Question {current} / {total}"
  revealed: Revealed + locked
  open: Open for votes
  openShort: Open
  locked: Locked
  openNote: Open discussion note
  closeNote: Close discussion note
  votes: "{count} votes"
  votesShort: Votes
  waiting: Waiting
  liveDistribution: Live distribution
  live: Live
  syncing: Syncing
  votesReceived: Votes received
  participation: Participation
  audiencePresent: Audience present
  questionState: Question state
  language: Language
  discussionNote: Discussion note
de:
  previous: Vorheriger Präsentationsschritt
  next: Nächster Präsentationsschritt
  questionProgress: "Frage {current} / {total}"
  revealed: Aufgedeckt + gesperrt
  open: Offen für Antworten
  openShort: Offen
  locked: Gesperrt
  openNote: Diskussionsnotiz öffnen
  closeNote: Diskussionsnotiz schließen
  votes: "{count} Stimmen"
  votesShort: Stimmen
  waiting: Wartet
  liveDistribution: Live-Verteilung
  live: Live
  syncing: Synchronisiert
  votesReceived: Erhaltene Stimmen
  participation: Teilnahme
  audiencePresent: Publikum
  questionState: Fragenstatus
  language: Sprache
  discussionNote: Diskussionsnotiz
fr:
  previous: Étape précédente de la présentation
  next: Étape suivante de la présentation
  questionProgress: "Question {current} / {total}"
  revealed: Révélée + verrouillée
  open: Ouverte aux votes
  openShort: Ouverte
  locked: Verrouillée
  openNote: Ouvrir la note de discussion
  closeNote: Fermer la note de discussion
  votes: "{count} votes"
  votesShort: Votes
  waiting: En attente
  liveDistribution: Répartition en direct
  live: En direct
  syncing: Synchronisation
  votesReceived: Votes reçus
  participation: Participation
  audiencePresent: Public présent
  questionState: État de la question
  language: Langue
  discussionNote: Note de discussion
ja:
  previous: 前のプレゼンターステップ
  next: 次のプレゼンターステップ
  questionProgress: "質問 {current} / {total}"
  revealed: 公開済み・ロック済み
  open: 回答受付中
  openShort: 受付中
  locked: ロック済み
  openNote: ディスカッションノートを開く
  closeNote: ディスカッションノートを閉じる
  votes: "{count} 票"
  votesShort: 票
  waiting: 待機中
  liveDistribution: ライブ分布
  live: ライブ
  syncing: 同期中
  votesReceived: 受信した票
  participation: 参加率
  audiencePresent: 参加者
  questionState: 質問の状態
  language: 言語
  discussionNote: ディスカッションノート
</i18n>

<style scoped>
@reference "../../assets/css/main.css";

.presenter-quiz-view {
  @apply h-full min-h-0 overflow-hidden;
  color: var(--presenter-text);
  font-size: calc(1rem * var(--presenter-text-scale));
}

.quiz-layout {
  @apply grid h-full min-h-0 grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)] gap-5 overflow-hidden;
}

.question-panel {
  @apply flex h-full min-h-0 flex-col rounded-[2rem] border px-5 py-5 shadow-sm;
  background: rgb(var(--presenter-panel-rgb) / calc(.6 * var(--presenter-foreground-opacity)));
  border-color: var(--presenter-border);
}

.results-panel {
  @apply flex h-full min-h-0 flex-col gap-3;
}

.result-card {
  @apply flex h-full min-h-0 flex-col rounded-[2rem] border px-4 py-4 text-white shadow-sm;
  background: rgb(2 6 23 / var(--presenter-foreground-opacity));
  border-color: var(--presenter-border);
}

.eyebrow-row,
.chart-card-header,
.answer-main-row,
.answer-stats,
.note-modal-header {
  @apply flex items-center justify-between gap-3;
}

.eyebrow-row,
.chart-card-header {
  @apply mb-3;
}

.eyebrow,
.stats-grid dt,
.note-title {
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
.note-trigger,
.note-modal-close {
  @apply flex cursor-pointer items-center justify-center rounded-full border transition-colors duration-200;
  @apply disabled:cursor-not-allowed disabled:opacity-50;
  min-height: max(44px, 2.75em);
  min-width: max(44px, 2.75em);
  background: var(--presenter-control);
  border-color: var(--presenter-border);
  color: var(--presenter-text);
}

.navigation-button:hover:not(:disabled),
.note-trigger:hover,
.note-modal-close:hover {
  @apply bg-slate-950 text-white;
}

.navigation-button:focus-visible,
.note-trigger:focus-visible,
.note-modal-close:focus-visible,
.language-picker select:focus-visible {
  @apply outline-3 outline-offset-2 outline-blue-600;
}

.phase-pill,
.chart-status {
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
  @apply m-0 flex flex-1 list-none flex-col gap-1.5 overflow-x-hidden overflow-y-auto p-0 pr-1;
}

.answer-card {
  @apply rounded-[1rem] border px-3 py-2 transition-colors duration-200;
  background: rgb(var(--presenter-answer-rgb) / calc(.8 * var(--presenter-foreground-opacity)));
  border-color: var(--presenter-border);
}

.answer-label {
  @apply leading-tight font-semibold;
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
  @apply mt-1 min-h-[0.8rem] font-semibold uppercase tracking-[0.14em];
  color: var(--presenter-muted);
  font-size: .58em;
}

.chart-status {
  @apply border border-white/20 bg-white/10 text-white/70;
}

.chart-shell {
  @apply flex justify-center py-2;
}

.chart-donut {
  @apply relative h-44 w-44 rounded-full;
}

.chart-donut::after {
  @apply absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2;
  @apply rounded-full bg-slate-950;
  content: '';
}

.chart-center {
  @apply absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col;
  @apply items-center justify-center text-center;
}

.chart-center strong {
  @apply font-black;
  font-size: 1.65em;
}

.chart-center span {
  @apply font-semibold uppercase tracking-[0.22em] text-white/60;
  font-size: .65em;
}

.stats-grid {
  @apply mt-auto grid grid-cols-2 gap-2.5;
}

.stats-grid div {
  @apply rounded-[1rem] border border-white/10 bg-white/6 px-3 py-2.5;
}

.stats-grid dd {
  @apply mt-1.5 block font-black;
  font-size: 1.125em;
}

.stats-grid dt {
  @apply text-white/55;
}

.language-picker {
  @apply absolute bottom-2 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5;
  @apply rounded-full border px-1.5 py-0.5 shadow-sm backdrop-blur-sm;
  background: rgb(var(--presenter-panel-rgb) / .8);
  border-color: var(--presenter-border);
}

.language-picker label {
  @apply font-bold uppercase tracking-[0.1em];
  color: var(--presenter-muted);
  font-size: .42em;
}

.language-picker select {
  @apply min-w-22 rounded-full border px-2 py-0.5 font-semibold outline-none transition-colors;
  background: var(--presenter-control);
  border-color: var(--presenter-border);
  color: var(--presenter-text);
  font-size: .64em;
}

.note-modal {
  @apply m-auto max-h-[calc(100dvh-4rem)] w-[calc(100%-4rem)] max-w-3xl rounded-[2rem];
  @apply border p-6 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm;
  background: rgb(var(--presenter-panel-rgb) / var(--presenter-foreground-opacity));
  border-color: var(--presenter-border);
  color: var(--presenter-text);
  font-size: calc(1rem * var(--presenter-text-scale));
}

.note-modal h2 {
  @apply mt-2 leading-tight font-black;
  font-size: 1.5em;
}

.note-modal p {
  @apply mt-5 leading-relaxed;
  color: var(--presenter-copy);
  font-size: 1.125em;
}

@container presenter-stage (max-width: 860px) {
  .quiz-layout {
    @apply grid-cols-1 overflow-y-auto;
  }

  .results-panel {
    @apply min-h-96;
  }

  .question-heading-row h1 {
    font-size: 1.75em;
  }

  .answer-label {
    font-size: .875em;
  }
}
</style>
