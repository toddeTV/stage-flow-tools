<script setup lang="ts">
import type { Question, AnswerOption } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
})

const { t } = useI18n()
const { getLocalizedText } = useLocalization()

const activeQuestion = ref<Question | null>(null)
const allQuestions = ref<Question[]>([])
const newQuestion = ref<{
  key: string
  question_text: string
  answer_options: { text: string, emoji?: string }[]
  note: string
}>({
  key: '',
  question_text: '{\n  "en": ""\n}',
  answer_options: [{ text: '{\n  "en": ""\n}', emoji: '' }, { text: '{\n  "en": ""\n}', emoji: '' }],
  note: '{\n  "en": ""\n}'
})

// Load questions
const { data: fetchedQuestions, error: fetchError, refresh: loadQuestions } = useFetch<Question[]>('/api/questions')

watch(fetchedQuestions, (newQuestions) => {
  if (newQuestions && Array.isArray(newQuestions)) {
    allQuestions.value = newQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    activeQuestion.value = newQuestions.find(q => q.is_active) || null
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


// Logout handler
async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  navigateTo('/login')
}

// Create question
async function handleCreateQuestion() {
  try {
    const questionText = JSON.parse(newQuestion.value.question_text)

    if (typeof questionText.en !== 'string' || !questionText.en.trim()) {
      alert(t('validationQuestionEnRequired'))
      return
    }

    const parsedNote = newQuestion.value.note.trim() ? JSON.parse(newQuestion.value.note) : undefined
    const note = parsedNote && typeof parsedNote === 'object'
      ? (Object.values(parsedNote as Record<string, string>).some(v => typeof v === 'string' && v.trim()) ? parsedNote : undefined)
      : undefined

    const answerOptions = newQuestion.value.answer_options.map(opt => ({
      text: JSON.parse(opt.text),
      emoji: opt.emoji
    }))

    const hasInvalidOption = answerOptions.some(
      opt => typeof opt.text?.en !== 'string' || !opt.text.en.trim(),
    )
    if (hasInvalidOption) {
      alert(t('validationOptionEnRequired'))
      return
    }

    if (answerOptions.length < 2) {
      alert(t('validationMinOptions'))
      return
    }

    await $fetch<Question>('/api/questions/create', {
      method: 'POST',
      body: {
        key: newQuestion.value.key,
        question_text: questionText,
        answer_options: answerOptions,
        note
      }
    })

    await loadQuestions()

    // Reset form
    newQuestion.value = {
      key: '',
      question_text: '{\n  "en": ""\n}',
      answer_options: [{ text: '{\n  "en": ""\n}', emoji: '' }, { text: '{\n  "en": ""\n}', emoji: '' }],
      note: '{\n  "en": ""\n}'
    }

    // alert('Question created successfully')
  }
  catch (error: unknown) {
    alert(t('failedCreateQuestion'))
  }
}

// Publish question
async function publishQuestion(key: string) {
  try {
    const question = await $fetch<Question>('/api/questions/publish', {
      method: 'POST',
      body: { key }
    })

    activeQuestion.value = question
    await loadQuestions()

    // alert('Question published successfully')
  }
  catch (error: unknown) {
    alert(t('failedPublishQuestion'))
  }
}

// Toggle lock
async function toggleLock() {
  if (!activeQuestion.value) return

  try {
    const question = await $fetch<Question>('/api/questions/toggle-lock', {
      method: 'POST',
      body: { questionId: activeQuestion.value.id }
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
      method: 'POST'
    })
    activeQuestion.value = null
    await loadQuestions()
  }
  catch (error: unknown) {
    alert(t('failedUnpublish'))
  }
}

// Publish next question
async function publishNextQuestion() {
  try {
    const question = await $fetch<Question>('/api/questions/publish-next', {
      method: 'POST'
    })
    activeQuestion.value = question
    await loadQuestions()
  }
  catch (error: unknown) {
    alert(t('failedPublishNext'))
  }
}

// Add option
function addOption() {
  newQuestion.value.answer_options.push({ text: '{\n  "en": ""\n}', emoji: '' })
}

// Remove option
function removeOption(index: number) {
  newQuestion.value.answer_options.splice(index, 1)
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-5">
    <UiPageTitle>{{ t('pageTitle') }}</UiPageTitle>

    <!-- Dashboard -->
    <div class="grid gap-8">
      <!-- Current Question -->
      <UiSection>
        <div class="flex justify-between items-center mb-5">
          <h2 class="section-heading">{{ t('currentActiveQuestion') }}</h2>
          <UiButton variant="secondary" @click="loadQuestions">{{ t('refreshButton') }}</UiButton>
        </div>
        <div v-if="activeQuestion" class="bg-gray-100 border-2 border-black p-5">
          <p class="text-lg mb-4 font-bold">{{ getLocalizedText(activeQuestion.question_text) }}</p>
          <ul class="list-none p-0 mb-5">
            <li v-for="(option, index) in activeQuestion.answer_options" :key="index" class="p-2.5 bg-white border border-black mb-1.5">
              {{ getLocalizedText(option.text) }} <span v-if="option.emoji">{{ option.emoji }}</span>
            </li>
          </ul>
          <div class="flex justify-between items-center">
            <span>{{ t('statusLabel') }} {{ activeQuestion.is_locked ? t('locked') : t('unlocked') }}</span>
            <div class="flex gap-2.5">
              <NuxtLink to="/results">
                <UiButton variant="secondary">
                  {{ t('viewLiveResults') }} →
                </UiButton>
              </NuxtLink>
              <UiButton @click="toggleLock">
                {{ activeQuestion.is_locked ? t('unlockQuestion') : t('lockQuestion') }}
              </UiButton>
              <UiButton @click="publishNextQuestion" variant="secondary">
                {{ t('publishNext') }} →
              </UiButton>
              <UiButton @click="unpublishActiveQuestion" variant="secondary">
                {{ t('unpublishButton') }}
              </UiButton>
            </div>
          </div>
        </div>
        <div v-else class="p-10 text-center bg-gray-100 border-2 border-dashed border-black">
          {{ t('noActiveQuestion') }}
        </div>
      </UiSection>

      <!-- New Question Form -->
      <UiSection>
        <h2 class="section-heading">{{ t('prepareNextQuestion') }}</h2>
        <form @submit.prevent="handleCreateQuestion" class="flex flex-col gap-5">
          <UiInput
            v-model="newQuestion.key"
            :placeholder="t('keyPlaceholder')"
            class="p-3 border-2 border-black text-base"
          />
          <textarea
            v-model="newQuestion.question_text"
            :placeholder="t('questionTextPlaceholder')"
            required
            class="json-textarea min-h-[100px]"
          ></textarea>

          <textarea
            v-model="newQuestion.note"
            :placeholder="t('notePlaceholder')"
            class="json-textarea min-h-[70px]"
          ></textarea>

          <div>
            <h3 class="mb-2.5 text-lg">{{ t('answerOptions') }}</h3>
            <div v-for="(option, index) in newQuestion.answer_options" :key="index" class="flex gap-2.5 mb-2.5 items-start">
              <textarea
                v-model="option.text"
                :placeholder="t('optionPlaceholder', { n: index + 1 })"
                required
                class="json-textarea min-h-[70px] flex-1"
              ></textarea>
              <UiInput
                :model-value="option.emoji || ''"
                :placeholder="t('emojiPlaceholder')"
                class="w-24"
                maxlength="10"
                @update:model-value="option.emoji = String($event || '').trim() || undefined"
              />
              <UiButton
                v-if="newQuestion.answer_options.length > 2"
                variant="danger"
                @click="removeOption(index)"
              >
                {{ t('removeButton') }}
              </UiButton>
            </div>
            <UiButton variant="secondary" @click="addOption">
              {{ t('addOptionButton') }}
            </UiButton>
          </div>

          <UiButton type="submit">{{ t('createQuestion') }}</UiButton>
        </form>
      </UiSection>

      <!-- All Questions -->
      <UiSection>
        <h2 class="section-heading">{{ t('allQuestions') }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="question in allQuestions"
            :key="question.id"
            class="bg-gray-100 border-2 border-black p-5"
            :class="{ 'opacity-50': question.alreadyPublished }"
          >
            <p class="font-bold mb-2.5">[{{ question.key }}] {{ getLocalizedText(question.question_text) }}</p>
            <p v-if="question.note" class="text-sm text-gray-600 mb-2.5 p-2 bg-gray-200 border border-black">{{ getLocalizedText(question.note) }}</p>
            <ul class="list-disc list-inside p-0 mb-4">
              <li v-for="(option, index) in question.answer_options" :key="index">
                {{ getLocalizedText(option.text) }} <span v-if="option.emoji">{{ option.emoji }}</span>
              </li>
            </ul>
            <UiButton @click="publishQuestion(question.key)">
              {{ t('publishThisQuestion') }}
            </UiButton>
          </div>
        </div>
      </UiSection>

      <UiButton @click="handleLogout" variant="secondary">{{ t('logoutButton') }}</UiButton>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  pageTitle: "Admin Dashboard"
  currentActiveQuestion: "Current Active Question"
  refreshButton: "Refresh"
  statusLabel: "Status:"
  locked: "Locked"
  unlocked: "Unlocked"
  viewLiveResults: "View Live Results"
  lockQuestion: "Lock Question"
  unlockQuestion: "Unlock Question"
  publishNext: "Publish Next"
  unpublishButton: "Unpublish"
  noActiveQuestion: "No active question"
  prepareNextQuestion: "Prepare Next Question"
  keyPlaceholder: "Enter a unique key/slug (optional, e.g., 'question-1')"
  questionTextPlaceholder: 'Enter question text as JSON, e.g., { "en": "Hello", "de": "Hallo" }'
  notePlaceholder: 'Enter note as JSON (optional), e.g., { "en": "Note" }'
  answerOptions: "Answer Options"
  removeButton: "Remove"
  addOptionButton: "Add Option"
  createQuestion: "Create Question"
  allQuestions: "All Questions"
  publishThisQuestion: "Publish This Question"
  logoutButton: "Logout"
  validationQuestionEnRequired: "Question text must have a non-empty English (\"en\") value."
  validationMinOptions: 'At least 2 answer options with an "en" key are required.'
  validationOptionEnRequired: "Each answer option must have a non-empty English (\"en\") text."
  optionPlaceholder: "Option {n} JSON"
  emojiPlaceholder: "Emoji"
  failedCreateQuestion: "Failed to create question."
  failedPublishQuestion: "Failed to publish question."
  failedToggleLock: "Failed to toggle lock status."
  failedUnpublish: "Failed to unpublish active question."
  failedPublishNext: "Failed to publish next question. There may be no unpublished questions left."
de:
  pageTitle: "Admin-Dashboard"
  currentActiveQuestion: "Aktuelle aktive Frage"
  refreshButton: "Aktualisieren"
  statusLabel: "Status:"
  locked: "Gesperrt"
  unlocked: "Entsperrt"
  viewLiveResults: "Live-Ergebnisse anzeigen"
  lockQuestion: "Frage sperren"
  unlockQuestion: "Frage entsperren"
  publishNext: "Nächste veröffentlichen"
  unpublishButton: "Veröffentlichung zurückziehen"
  noActiveQuestion: "Keine aktive Frage"
  prepareNextQuestion: "Nächste Frage vorbereiten"
  keyPlaceholder: "Eindeutigen Schlüssel eingeben (optional, z. B. 'frage-1')"
  questionTextPlaceholder: 'Fragetext als JSON eingeben, z.B. { "en": "Hello", "de": "Hallo" }'
  notePlaceholder: 'Notiz als JSON eingeben (optional), z.B. { "en": "Notiz" }'
  answerOptions: "Antwortoptionen"
  removeButton: "Entfernen"
  addOptionButton: "Option hinzufügen"
  createQuestion: "Frage erstellen"
  allQuestions: "Alle Fragen"
  publishThisQuestion: "Diese Frage veröffentlichen"
  logoutButton: "Abmelden"
  validationQuestionEnRequired: "Fragetext muss einen nicht-leeren englischen (\"en\") Wert haben."
  validationMinOptions: 'Mindestens 2 Antwortoptionen mit einem "en"-Schlüssel sind erforderlich.'
  validationOptionEnRequired: "Jede Antwortoption muss einen nicht-leeren englischen (\"en\") Text haben."
  optionPlaceholder: "Option {n} JSON"
  emojiPlaceholder: "Emoji"
  failedCreateQuestion: "Frage konnte nicht erstellt werden."
  failedPublishQuestion: "Frage konnte nicht veröffentlicht werden."
  failedToggleLock: "Sperrstatus konnte nicht geändert werden."
  failedUnpublish: "Veröffentlichung konnte nicht zurückgezogen werden."
  failedPublishNext: "Nächste Frage konnte nicht veröffentlicht werden. Möglicherweise gibt es keine unveröffentlichten Fragen mehr."
ja:
  pageTitle: "管理ダッシュボード"
  currentActiveQuestion: "現在のアクティブな質問"
  refreshButton: "更新"
  statusLabel: "ステータス："
  locked: "ロック済み"
  unlocked: "ロック解除"
  viewLiveResults: "ライブ結果を表示"
  lockQuestion: "質問をロック"
  unlockQuestion: "質問のロックを解除"
  publishNext: "次を公開"
  unpublishButton: "公開停止"
  noActiveQuestion: "アクティブな質問はありません"
  prepareNextQuestion: "次の質問を準備"
  keyPlaceholder: "一意のキー/スラグを入力（任意、例：'question-1'）"
  questionTextPlaceholder: '質問テキストをJSONで入力、例：{ "en": "Hello", "de": "Hallo" }'
  notePlaceholder: 'ノートをJSONで入力（任意）、例：{ "en": "メモ" }'
  answerOptions: "回答オプション"
  removeButton: "削除"
  addOptionButton: "オプションを追加"
  createQuestion: "質問を作成"
  allQuestions: "全ての質問"
  publishThisQuestion: "この質問を公開"
  logoutButton: "ログアウト"
  validationQuestionEnRequired: "質問テキストには空でない英語（\"en\"）の値が必要です。"
  validationMinOptions: '"en"キーを持つ回答オプションが2つ以上必要です。'
  validationOptionEnRequired: "各回答オプションには空でない英語（\"en\"）テキストが必要です。"
  optionPlaceholder: "オプション {n} JSON"
  emojiPlaceholder: "絵文字"
  failedCreateQuestion: "質問の作成に失敗しました。"
  failedPublishQuestion: "質問の公開に失敗しました。"
  failedToggleLock: "ロック状態の切り替えに失敗しました。"
  failedUnpublish: "公開停止に失敗しました。"
  failedPublishNext: "次の質問の公開に失敗しました。未公開の質問がない可能性があります。"
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
