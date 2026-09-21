<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PresenterCurrentState, Question } from '~/types'
import type { PresenterParameters } from '~/utils/presenter-parameters'
import type { PresenterQuizPhase } from '~/utils/presenter-quiz-state'
import type { PresenterQuizAnswer } from '~/components/presenter/presenter-quiz'

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
  'language-change': [language: string]
  navigate: [direction: 'next' | 'previous']
}>()

const chartColors = [
  '#0077BB',
  '#EE7733',
  '#009988',
  '#EE3377',
  '#33BBEE',
  '#44AA99',
  '#CCBB44',
  '#AA4499',
  '#332288',
  '#999933',
]
const { t } = useI18n()
const isNoteModalOpen = ref(false)
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
const displayAnswers = computed<PresenterQuizAnswer[]>(() => props.question.answer_options.map((option, index) => ({
  color: chartColors[index % chartColors.length]!,
  count: liveAnswers.value[index]?.count ?? 0,
  emoji: option.emoji ?? liveAnswers.value[index]?.emoji ?? '',
  id: `${props.question.key}-${index}`,
  isCorrect: option.emoji === '⭐',
  label: localizedText(option.text, selectedLanguage.value),
  percent: liveAnswers.value[index]?.percent ?? 0,
})))
const questionTitle = computed(() => localizedText(props.question.question_text, selectedLanguage.value))
const noteText = computed(() => localizedText(props.question.note, selectedLanguage.value))
const isReveal = computed(() => props.phase === 'reveal')
const hasRevealNote = computed(() => isReveal.value && Boolean(noteText.value))
const receivedAnswers = computed(() => currentQuestionMatches.value ? props.currentState?.receivedAnswers ?? 0 : 0)
const participation = computed(() => currentQuestionMatches.value ? props.currentState?.receivedAnswersPercent ?? 0 : 0)
const totalUsers = computed(() => props.currentState?.totalUsers ?? 0)

function openNoteModal() {
  if (hasRevealNote.value) isNoteModalOpen.value = true
}

function selectLanguage(event: Event) {
  const language = (event.target as HTMLSelectElement).value
  if (!language) return

  selectedLanguage.value = language
  emit('language-change', language)
}

watch(availableLanguages, (options) => {
  const languages = options.map(option => option.code)
  if (availableCandidate(selectedLanguage.value, languages)) return
  const preferred = [
    normalizeLocaleCode(props.parameters.language),
    normalizeLocaleCode(navigator.language),
    'en',
  ].map(candidate => availableCandidate(candidate, languages)).find(Boolean)
  selectedLanguage.value = preferred ?? languages[0] ?? 'en'
}, { immediate: true })

watch([
  isReveal,
  noteText,
], ([
  reveal,
  note,
]) => {
  if (!reveal || !note) isNoteModalOpen.value = false
})
</script>

<template>
  <div class="presenter-quiz-view">
    <div class="quiz-layout">
      <PresenterQuizQuestionPanel
        :answers="displayAnswers"
        :busy="props.busy"
        :has-reveal-note="hasRevealNote"
        :is-reveal="isReveal"
        :question-count="props.questions.length"
        :question-index="props.questionIndex"
        :question-title="questionTitle"
        @navigate="emit('navigate', $event)"
        @open-note="openNoteModal"
      />

      <PresenterQuizResultsPanel
        :answers="displayAnswers"
        :is-live="currentQuestionMatches"
        :is-reveal="isReveal"
        :participation="participation"
        :received-answers="receivedAnswers"
        :total-users="totalUsers"
      />
    </div>

    <div v-if="availableLanguages.length" class="language-picker">
      <label for="presenter-quiz-language">{{ t('language') }}</label>
      <select id="presenter-quiz-language" :value="selectedLanguage" @change="selectLanguage">
        <option v-for="language in availableLanguages" :key="language.code" :value="language.code">
          {{ language.label }}
        </option>
      </select>
    </div>

    <PresenterQuizNoteDialog
      v-model="isNoteModalOpen"
      :can-open="hasRevealNote"
      :note-text="noteText"
      :question-title="questionTitle"
      :stage-scale="props.parameters.stageScale"
    />
  </div>
</template>

<i18n lang="yaml">
en:
  language: Language
de:
  language: Sprache
fr:
  language: Langue
ja:
  language: 言語
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

.language-picker select:focus-visible {
  @apply outline-3 outline-offset-2 outline-blue-600;
}

@container presenter-stage (max-width: 860px) {
  .quiz-layout {
    @apply grid-cols-1 overflow-y-auto;
  }
}
</style>
