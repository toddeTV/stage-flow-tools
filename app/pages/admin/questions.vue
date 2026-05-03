<script setup lang="ts">
import type {
  InputQuestion,
  LocalizedString,
  Question,
} from '~/types'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const { t } = useI18n()
const { getLocalizedText } = useLocalization()

type QuestionFormOption = {
  text: string
  emoji?: string
}

type QuestionForm = {
  key: string
  question_text: string
  answer_options: QuestionFormOption[]
  note: string
}

function createDefaultQuestionForm(): QuestionForm {
  return {
    key: '',
    question_text: '{\n  "en": ""\n}',
    answer_options: [
      { text: '{\n  "en": ""\n}', emoji: '' },
      { text: '{\n  "en": ""\n}', emoji: '' },
    ],
    note: '{\n  "en": ""\n}',
  }
}

function stringifyLocalizedValue(value?: LocalizedString): string {
  return JSON.stringify(value ?? { en: '' }, null, 2)
}

function createQuestionFormFromQuestion(question: Question): QuestionForm {
  return {
    key: question.key,
    question_text: stringifyLocalizedValue(question.question_text),
    answer_options: question.answer_options.map(option => ({
      text: stringifyLocalizedValue(option.text),
      emoji: option.emoji ?? '',
    })),
    note: stringifyLocalizedValue(question.note),
  }
}

function isQuestionEditable(question: Question): boolean {
  return !question.is_active && !question.alreadyPublished
}

function parseQuestionFormPayload(): InputQuestion {
  const parsedNote = questionForm.value.note.trim() ? JSON.parse(questionForm.value.note) : undefined

  return {
    key: questionForm.value.key,
    question_text: JSON.parse(questionForm.value.question_text) as LocalizedString,
    answer_options: questionForm.value.answer_options.map(option => ({
      text: JSON.parse(option.text) as LocalizedString,
      emoji: option.emoji,
    })),
    note: parsedNote,
  }
}

function getRequestErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === 'object' && error !== null) {
    const statusMessage = 'statusMessage' in error && typeof error.statusMessage === 'string'
      ? error.statusMessage
      : undefined

    if (statusMessage) {
      return statusMessage
    }

    const data = 'data' in error && typeof error.data === 'object' && error.data !== null
      ? error.data as { statusMessage?: unknown, message?: unknown }
      : undefined

    if (typeof data?.statusMessage === 'string') {
      return data.statusMessage
    }

    if (typeof data?.message === 'string') {
      return data.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

const activeQuestion = ref<Question | null>(null)
const allQuestions = ref<Question[]>([])
const questionFormSection = ref<HTMLElement | null>(null)
const editingQuestionId = ref<string | null>(null)
const isSavingQuestion = ref(false)
const questionForm = ref<QuestionForm>(createDefaultQuestionForm())
const isEditMode = computed(() => editingQuestionId.value !== null)
const formTitle = computed(() => isEditMode.value ? t('editQuestionTitle') : t('prepareNextQuestion'))
const submitButtonLabel = computed(() => isEditMode.value ? t('saveQuestion') : t('createQuestion'))

// Load questions
const { data: fetchedQuestions, error: fetchError, refresh: loadQuestions } = useFetch<Question[]>('/api/questions')

watch(fetchedQuestions, (newQuestions) => {
  if (newQuestions && Array.isArray(newQuestions)) {
    allQuestions.value = newQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    activeQuestion.value = newQuestions.find(q => q.is_active) || null

    if (editingQuestionId.value) {
      const editedQuestion = allQuestions.value.find(question => question.id === editingQuestionId.value)

      if (!editedQuestion || !isQuestionEditable(editedQuestion)) {
        cancelEditingQuestion()
      }
    }
  }
  else {
    allQuestions.value = []
    activeQuestion.value = null
  }
})

watch(fetchError, (newError) => {
  if (newError) {
    logger_error('Failed to load questions:', newError)
    activeQuestion.value = null
  }
})

async function startEditingQuestion(question: Question) {
  if (!isQuestionEditable(question)) {
    return
  }

  editingQuestionId.value = question.id
  questionForm.value = createQuestionFormFromQuestion(question)

  await nextTick()
  questionFormSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function cancelEditingQuestion() {
  editingQuestionId.value = null
  questionForm.value = createDefaultQuestionForm()
}

// Create or update question
async function handleSaveQuestion() {
  let payload: InputQuestion

  try {
    payload = parseQuestionFormPayload()
  }
  catch {
    alert(t('invalidJson'))
    return
  }

  isSavingQuestion.value = true

  try {
    if (editingQuestionId.value) {
      await $fetch<Question>('/api/questions/update', {
        method: 'POST',
        body: {
          questionId: editingQuestionId.value,
          ...payload,
        },
      })
    }
    else {
      await $fetch<Question>('/api/questions/create', {
        method: 'POST',
        body: payload,
      })
    }

    await loadQuestions()
    cancelEditingQuestion()
  }
  catch (error: unknown) {
    alert(getRequestErrorMessage(error, isEditMode.value ? t('failedUpdateQuestion') : t('failedCreateQuestion')))
  }
  finally {
    isSavingQuestion.value = false
  }
}

// Publish question
async function publishQuestion(key: string) {
  try {
    const question = await $fetch<Question>('/api/questions/publish', {
      method: 'POST',
      body: { key },
    })

    activeQuestion.value = question
    await loadQuestions()

    // alert('Question published successfully')
  }
  catch {
    alert(t('failedPublishQuestion'))
  }
}

// Toggle lock
async function toggleLock() {
  if (!activeQuestion.value) return

  try {
    const question = await $fetch<Question>('/api/questions/toggle-lock', {
      method: 'POST',
      body: { questionId: activeQuestion.value.id },
    })

    activeQuestion.value = question
  }
  catch (error: unknown) {
    logger_error('Failed to toggle lock status from results page', error)
    alert(t('failedToggleLock'))
  }
}

// Unpublish active question
async function unpublishActiveQuestion() {
  try {
    await $fetch('/api/questions/unpublish-active', {
      method: 'POST',
    })
    activeQuestion.value = null
    await loadQuestions()
  }
  catch {
    alert(t('failedUnpublish'))
  }
}

// Publish next question
async function publishNextQuestion() {
  try {
    const question = await $fetch<Question>('/api/questions/publish-next', {
      method: 'POST',
    })
    activeQuestion.value = question
    await loadQuestions()
  }
  catch {
    alert(t('failedPublishNext'))
  }
}

// Add option
function addOption() {
  questionForm.value.answer_options.push({ text: '{\n  "en": ""\n}', emoji: '' })
}

// Remove option
function removeOption(index: number) {
  questionForm.value.answer_options.splice(index, 1)
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-5">
    <UiPageTitle>{{ t('pageTitle') }}</UiPageTitle>

    <!-- Dashboard -->
    <div class="grid gap-8">
      <!-- Current Question -->
      <UiSection>
        <div class="mb-5 flex items-center justify-between">
          <h2 class="section-heading">
            {{ t('currentActiveQuestion') }}
          </h2>
          <UiButton variant="secondary" @click="loadQuestions">
            {{ t('refreshButton') }}
          </UiButton>
        </div>
        <div v-if="activeQuestion" class="border-2 border-black bg-gray-100 p-5">
          <p class="mb-4 text-lg font-bold">
            {{ getLocalizedText(activeQuestion.question_text) }}
          </p>
          <ul class="mb-5 list-none p-0">
            <li
              v-for="(option, index) in activeQuestion.answer_options"
              :key="index"
              class="mb-1.5 border border-black bg-white p-2.5"
            >
              {{ getLocalizedText(option.text) }} <span v-if="option.emoji">{{ option.emoji }}</span>
            </li>
          </ul>
          <div class="flex items-center justify-between">
            <span>{{ t('statusLabel') }} {{ activeQuestion.is_locked ? t('locked') : t('unlocked') }}</span>
            <div class="flex gap-2.5">
              <NuxtLink to="/admin/results">
                <UiButton variant="secondary">
                  {{ t('viewLiveResults') }} →
                </UiButton>
              </NuxtLink>
              <UiButton @click="toggleLock">
                {{ activeQuestion.is_locked ? t('unlockQuestion') : t('lockQuestion') }}
              </UiButton>
              <UiButton variant="secondary" @click="publishNextQuestion">
                {{ t('publishNext') }} →
              </UiButton>
              <UiButton variant="secondary" @click="unpublishActiveQuestion">
                {{ t('unpublishButton') }}
              </UiButton>
            </div>
          </div>
        </div>
        <div v-else class="border-2 border-dashed border-black bg-gray-100 p-10 text-center">
          {{ t('noActiveQuestion') }}
        </div>
      </UiSection>

      <!-- Question Form -->
      <div ref="questionFormSection">
        <UiSection>
          <h2 class="section-heading">
            {{ formTitle }}
          </h2>

          <p v-if="isEditMode" class="mb-5 border border-black bg-amber-100 p-3 text-sm font-bold">
            {{ t('editModeNotice') }}
          </p>

          <form class="flex flex-col gap-5" @submit.prevent="handleSaveQuestion">
            <UiInput
              v-model="questionForm.key"
              class="border-2 border-black p-3 text-base"
              :placeholder="t('keyPlaceholder')"
            />
            <textarea
              v-model="questionForm.question_text"
              class="json-textarea min-h-[100px]"
              :placeholder="t('questionTextPlaceholder')"
              required
            />

            <textarea
              v-model="questionForm.note"
              class="json-textarea min-h-[70px]"
              :placeholder="t('notePlaceholder')"
            />

            <div>
              <h3 class="mb-2.5 text-lg">
                {{ t('answerOptions') }}
              </h3>
              <div
                v-for="(option, index) in questionForm.answer_options"
                :key="index"
                class="mb-2.5 flex items-start gap-2.5"
              >
                <textarea
                  v-model="option.text"
                  class="json-textarea min-h-[70px] flex-1"
                  :placeholder="t('optionPlaceholder', { n: index + 1 })"
                  required
                />
                <UiInput
                  class="w-24"
                  maxlength="10"
                  :model-value="option.emoji || ''"
                  :placeholder="t('emojiPlaceholder')"
                  @update:model-value="option.emoji = String($event || '').trim() || undefined"
                />
                <UiButton
                  v-if="questionForm.answer_options.length > 2"
                  type="button"
                  variant="danger"
                  @click="removeOption(index)"
                >
                  {{ t('removeButton') }}
                </UiButton>
              </div>
              <UiButton type="button" variant="secondary" @click="addOption">
                {{ t('addOptionButton') }}
              </UiButton>
            </div>

            <div class="flex flex-wrap gap-2.5">
              <UiButton :disabled="isSavingQuestion" type="submit">
                {{ submitButtonLabel }}
              </UiButton>
              <UiButton
                v-if="isEditMode"
                :disabled="isSavingQuestion"
                type="button"
                variant="secondary"
                @click="cancelEditingQuestion"
              >
                {{ t('cancelEditing') }}
              </UiButton>
            </div>
          </form>
        </UiSection>
      </div>

      <!-- All Questions -->
      <UiSection>
        <h2 class="section-heading">
          {{ t('allQuestions') }}
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="question in allQuestions"
            :key="question.id"
            class="border-2 border-black bg-gray-100 p-5"
            :class="{ 'opacity-50': question.alreadyPublished }"
          >
            <p class="mb-2.5 font-bold">
              [{{ question.key }}] {{ getLocalizedText(question.question_text) }}
            </p>
            <p v-if="question.note" class="mb-2.5 border border-black bg-gray-200 p-2 text-sm text-gray-600">
              {{ getLocalizedText(question.note) }}
            </p>
            <ul class="mb-4 list-inside list-disc p-0">
              <li v-for="(option, index) in question.answer_options" :key="index">
                {{ getLocalizedText(option.text) }} <span v-if="option.emoji">{{ option.emoji }}</span>
              </li>
            </ul>

            <p v-if="question.is_active" class="mb-4 text-sm font-bold text-gray-700">
              {{ t('editBlockedActive') }}
            </p>
            <p v-else-if="question.alreadyPublished" class="mb-4 text-sm font-bold text-gray-700">
              {{ t('editBlockedPublished') }}
            </p>

            <div class="flex flex-wrap gap-2.5">
              <UiButton @click="publishQuestion(question.key)">
                {{ t('publishThisQuestion') }}
              </UiButton>
              <UiButton
                v-if="isQuestionEditable(question)"
                variant="secondary"
                @click="startEditingQuestion(question)"
              >
                {{ editingQuestionId === question.id ? t('editingQuestion') : t('editQuestion') }}
              </UiButton>
            </div>
          </div>
        </div>
      </UiSection>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  pageTitle: Admin Dashboard
  currentActiveQuestion: Current Active Question
  refreshButton: Refresh
  statusLabel: "Status:"
  locked: Locked
  unlocked: Unlocked
  viewLiveResults: View Live Results
  lockQuestion: Lock Question
  unlockQuestion: Unlock Question
  publishNext: Publish Next
  unpublishButton: Unpublish
  noActiveQuestion: No active question
  prepareNextQuestion: Prepare Next Question
  editQuestionTitle: Edit Question
  editModeNotice: Edit mode active. Only unpublished inactive questions can be changed.
  keyPlaceholder: "Enter a unique key/slug (optional, e.g., 'question-1')"
  questionTextPlaceholder: "Enter question text as JSON, e.g., {'{'} \"en\": \"Hello\", \"de\": \"Hallo\" {'}'}"
  notePlaceholder: "Enter note as JSON (optional), e.g., {'{'} \"en\": \"Note\" {'}'}"
  answerOptions: Answer Options
  removeButton: Remove
  addOptionButton: Add Option
  createQuestion: Create Question
  saveQuestion: Save Question
  cancelEditing: Cancel Editing
  editQuestion: Edit Question
  editingQuestion: Editing
  editBlockedActive: Edit disabled for active question.
  editBlockedPublished: Edit disabled for already published question.
  allQuestions: All Questions
  publishThisQuestion: Publish This Question
  validationQuestionEnRequired: "Question text must have a non-empty English (\"en\") value."
  validationMinOptions: 'At least 2 answer options with an "en" key are required.'
  validationOptionEnRequired: "Each answer option must have a non-empty English (\"en\") text."
  optionPlaceholder: "Option {n} JSON"
  emojiPlaceholder: Emoji
  invalidJson: Invalid JSON in question form.
  failedCreateQuestion: Failed to create question.
  failedUpdateQuestion: Failed to update question.
  failedPublishQuestion: Failed to publish question.
  failedToggleLock: Failed to toggle lock status.
  failedUnpublish: Failed to unpublish active question.
  failedPublishNext: Failed to publish next question. There may be no unpublished questions left.
de:
  pageTitle: Admin-Dashboard
  currentActiveQuestion: Aktuelle aktive Frage
  refreshButton: Aktualisieren
  statusLabel: "Status:"
  locked: Gesperrt
  unlocked: Entsperrt
  viewLiveResults: Live-Ergebnisse anzeigen
  lockQuestion: Frage sperren
  unlockQuestion: Frage entsperren
  publishNext: Nächste veröffentlichen
  unpublishButton: Veröffentlichung zurückziehen
  noActiveQuestion: Keine aktive Frage
  prepareNextQuestion: Nächste Frage vorbereiten
  editQuestionTitle: Frage bearbeiten
  editModeNotice: Bearbeitungsmodus aktiv. Nur unveröffentlichte und inaktive Fragen können geändert werden.
  keyPlaceholder: "Eindeutigen Schlüssel eingeben (optional, z.B. 'frage-1')"
  questionTextPlaceholder: "Fragetext als JSON eingeben, z.B. {'{'} \"en\": \"Hello\", \"de\": \"Hallo\" {'}'}"
  notePlaceholder: "Notiz als JSON eingeben (optional), z.B. {'{'} \"en\": \"Notiz\" {'}'}"
  answerOptions: Antwortoptionen
  removeButton: Entfernen
  addOptionButton: Option hinzufügen
  createQuestion: Frage erstellen
  saveQuestion: Frage speichern
  cancelEditing: Bearbeitung abbrechen
  editQuestion: Frage bearbeiten
  editingQuestion: Wird bearbeitet
  editBlockedActive: Bearbeitung für aktive Frage deaktiviert.
  editBlockedPublished: Bearbeitung für bereits veröffentlichte Frage deaktiviert.
  allQuestions: Alle Fragen
  publishThisQuestion: Diese Frage veröffentlichen
  validationQuestionEnRequired: "Fragetext muss einen nicht-leeren englischen (\"en\") Wert haben."
  validationMinOptions: 'Mindestens 2 Antwortoptionen mit einem "en"-Schlüssel sind erforderlich.'
  validationOptionEnRequired: "Jede Antwortoption muss einen nicht-leeren englischen (\"en\") Text haben."
  optionPlaceholder: "Option {n} JSON"
  emojiPlaceholder: Emoji
  invalidJson: Ungültiges JSON im Fragenformular.
  failedCreateQuestion: Frage konnte nicht erstellt werden.
  failedUpdateQuestion: Frage konnte nicht aktualisiert werden.
  failedPublishQuestion: Frage konnte nicht veröffentlicht werden.
  failedToggleLock: Sperrstatus konnte nicht geändert werden.
  failedUnpublish: Veröffentlichung konnte nicht zurückgezogen werden.
  failedPublishNext: >-
    Nächste Frage konnte nicht veröffentlicht werden.
    Möglicherweise gibt es keine unveröffentlichten Fragen mehr.
ja:
  pageTitle: 管理ダッシュボード
  currentActiveQuestion: 現在のアクティブな質問
  refreshButton: 更新
  statusLabel: ステータス：
  locked: ロック済み
  unlocked: ロック解除
  viewLiveResults: ライブ結果を表示
  lockQuestion: 質問をロック
  unlockQuestion: 質問のロックを解除
  publishNext: 次を公開
  unpublishButton: 公開停止
  noActiveQuestion: アクティブな質問はありません
  prepareNextQuestion: 次の質問を準備
  editQuestionTitle: 質問を編集
  editModeNotice: 編集モードです。未公開かつ非アクティブな質問だけ変更できます。
  keyPlaceholder: "一意のキー/スラグを入力（任意、例：'question-1'）"
  questionTextPlaceholder: "質問テキストをJSONで入力、例：{'{'} \"en\": \"Hello\", \"de\": \"Hallo\" {'}'}"
  notePlaceholder: "ノートをJSONで入力（任意）、例：{'{'} \"en\": \"メモ\" {'}'}"
  answerOptions: 回答オプション
  removeButton: 削除
  addOptionButton: オプションを追加
  createQuestion: 質問を作成
  saveQuestion: 質問を保存
  cancelEditing: 編集を取り消す
  editQuestion: 質問を編集
  editingQuestion: 編集中
  editBlockedActive: アクティブな質問は編集できません。
  editBlockedPublished: 既に公開済みの質問は編集できません。
  allQuestions: 全ての質問
  publishThisQuestion: この質問を公開
  validationQuestionEnRequired: "質問テキストには空でない英語（\"en\"）の値が必要です。"
  validationMinOptions: '"en"キーを持つ回答オプションが2つ以上必要です。'
  validationOptionEnRequired: "各回答オプションには空でない英語（\"en\"）テキストが必要です。"
  optionPlaceholder: "オプション {n} JSON"
  emojiPlaceholder: 絵文字
  invalidJson: 質問フォームのJSONが不正です。
  failedCreateQuestion: 質問の作成に失敗しました。
  failedUpdateQuestion: 質問の更新に失敗しました。
  failedPublishQuestion: 質問の公開に失敗しました。
  failedToggleLock: ロック状態の切り替えに失敗しました。
  failedUnpublish: 公開停止に失敗しました。
  failedPublishNext: 次の質問の公開に失敗しました。未公開の質問がない可能性があります。
</i18n>

<style scoped>
@reference "tailwindcss";

.section-heading {
  @apply mb-5 border-b-[3px] border-black pb-2.5 text-3xl uppercase;
}

.json-textarea {
  @apply resize-y border-2 border-black bg-white p-3 font-mono text-base;
}
</style>
