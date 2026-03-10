<script setup lang="ts">
import type { Question, AnswerOption, LocalizedString } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
})

const { t, locale } = useI18n()

// Helper to get localized text with fallback to English
function getLocalizedText(text: LocalizedString | string | undefined): string {
  if (typeof text === 'object' && text !== null) {
    return text[locale.value] || text.en || ''
  }
  return text || ''
}

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
    const note = newQuestion.value.note.trim() ? JSON.parse(newQuestion.value.note) : undefined

    const answerOptions = newQuestion.value.answer_options.map(opt => ({
      text: JSON.parse(opt.text),
      emoji: opt.emoji
    })).filter(opt => opt.text.en)

    if (answerOptions.length < 2) {
      alert('At least 2 answer options with an "en" key are required.')
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
    alert('Failed to create question')
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
    alert('Failed to publish question')
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
    alert('Failed to toggle lock status')
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
    alert('Failed to unpublish active question.')
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
    alert('Failed to publish next question. Maybe there are no unpublished questions left.')
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
          <h2 class="mb-5 text-3xl uppercase border-b-[3px] border-black pb-2.5">{{ t('currentActiveQuestion') }}</h2>
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
        <h2 class="mb-5 text-3xl uppercase border-b-[3px] border-black pb-2.5">{{ t('prepareNextQuestion') }}</h2>
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
            class="p-3 border-2 border-black text-base min-h-[100px] resize-y bg-white font-mono"
          ></textarea>

          <textarea
            v-model="newQuestion.note"
            :placeholder="t('notePlaceholder')"
            class="p-3 border-2 border-black text-base min-h-[70px] resize-y bg-white font-mono"
          ></textarea>

          <div>
            <h3 class="mb-2.5 text-lg">{{ t('answerOptions') }}</h3>
            <div v-for="(option, index) in newQuestion.answer_options" :key="index" class="flex gap-2.5 mb-2.5 items-start">
              <textarea
                v-model="option.text"
                :placeholder="`Option ${index + 1} JSON`"
                required
                class="flex-1 p-3 border-2 border-black text-base min-h-[70px] resize-y bg-white font-mono"
              ></textarea>
              <UiInput
                :model-value="option.emoji || ''"
                placeholder="Emoji"
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
        <h2 class="mb-5 text-3xl uppercase border-b-[3px] border-black pb-2.5">{{ t('allQuestions') }}</h2>
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
  publishNext: "Nachste veroffentlichen"
  unpublishButton: "Veroffentlichung zuruckziehen"
  noActiveQuestion: "Keine aktive Frage"
  prepareNextQuestion: "Nachste Frage vorbereiten"
  keyPlaceholder: "Eindeutigen Schlussel eingeben (optional, z.B. 'frage-1')"
  questionTextPlaceholder: 'Fragetext als JSON eingeben, z.B. { "en": "Hello", "de": "Hallo" }'
  notePlaceholder: 'Notiz als JSON eingeben (optional), z.B. { "en": "Notiz" }'
  answerOptions: "Antwortoptionen"
  removeButton: "Entfernen"
  addOptionButton: "Option hinzufugen"
  createQuestion: "Frage erstellen"
  allQuestions: "Alle Fragen"
  publishThisQuestion: "Diese Frage veroffentlichen"
  logoutButton: "Abmelden"
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
</i18n>
