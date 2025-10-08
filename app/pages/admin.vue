<script setup lang="ts">
import type { Question, AnswerOption } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
  footer: true,
  background: true,
})

const activeQuestion = ref<Question | null>(null)
const allQuestions = ref<Question[]>([])
const newQuestion = ref<{
  question_text: string
  answer_options: AnswerOption[]
  note?: string
}>({
  question_text: '',
  answer_options: [{ text: '' }, { text: '' }],
  note: ''
})

// Load questions
const { data: fetchedQuestions, error: fetchError, refresh: loadQuestions } = useFetch<Question[]>('/api/questions')

watch(fetchedQuestions, (newQuestions) => {
  if (newQuestions && Array.isArray(newQuestions)) {
    allQuestions.value = newQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    activeQuestion.value = newQuestions.find(q => (q as any).is_active) || null
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
    // Filter out empty options
    const filteredOptions = newQuestion.value.answer_options
      .map(opt => ({
        text: opt.text.trim(),
        emoji: opt.emoji?.trim() || undefined
      }))
      .filter(opt => opt.text)

    if (filteredOptions.length < 2) {
      alert('At least 2 answer options required')
      return
    }

    const question = await $fetch<Question>('/api/questions/create', {
      method: 'POST',
      body: {
        question_text: newQuestion.value.question_text,
        answer_options: filteredOptions,
        note: newQuestion.value.note
      }
    })

    await loadQuestions()

    // Reset form
    newQuestion.value = {
      question_text: '',
      answer_options: [{ text: '' }, { text: '' }],
      note: ''
    }

    // alert('Question created successfully')
  }
  catch (error: unknown) {
    alert('Failed to create question')
  }
}

// Publish question
async function publishQuestion(questionId: string) {
  try {
    const question = await $fetch<Question>('/api/questions/publish', {
      method: 'POST',
      body: { questionId }
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
    alert('Failed to toggle lock status')
  }
}

// Add option
function addOption() {
  newQuestion.value.answer_options.push({ text: '' })
}

// Remove option
function removeOption(index: number) {
  newQuestion.value.answer_options.splice(index, 1)
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-5">
    <UiPageTitle>Admin Dashboard</UiPageTitle>

    <!-- Dashboard -->
    <div class="grid gap-8">
      <!-- Current Question -->
      <UiSection>
        <div class="flex justify-between items-center mb-5">
          <h2 class="mb-5 text-3xl uppercase border-b-[3px] border-black pb-2.5">Current Active Question</h2>
          <UiButton variant="secondary" @click="loadQuestions">Refresh</UiButton>
        </div>
        <div v-if="activeQuestion" class="bg-gray-100 border-2 border-black p-5">
          <p class="text-lg mb-4 font-bold">{{ activeQuestion.question_text }}</p>
          <ul class="list-none p-0 mb-5">
            <li v-for="(option, index) in activeQuestion.answer_options" :key="index" class="p-2.5 bg-white border border-black mb-1.5">
              {{ option.text }} <span v-if="option.emoji">{{ option.emoji }}</span>
            </li>
          </ul>
          <div class="flex justify-between items-center">
            <span>Status: {{ activeQuestion.is_locked ? 'Locked' : 'Unlocked' }}</span>
            <div class="flex gap-2.5">
              <NuxtLink to="/results">
                <UiButton variant="secondary">
                  View Live Results →
                </UiButton>
              </NuxtLink>
              <UiButton @click="toggleLock">
                {{ activeQuestion.is_locked ? 'Unlock' : 'Lock' }} Question
              </UiButton>
            </div>
          </div>
        </div>
        <div v-else class="p-10 text-center bg-gray-100 border-2 border-dashed border-black">
          No active question
        </div>
      </UiSection>

      <!-- New Question Form -->
      <UiSection>
        <h2 class="mb-5 text-3xl uppercase border-b-[3px] border-black pb-2.5">Prepare Next Question</h2>
        <form @submit.prevent="handleCreateQuestion" class="flex flex-col gap-5">
          <textarea
            v-model="newQuestion.question_text"
            placeholder="Enter question text"
            required
            class="p-3 border-2 border-black text-base min-h-[100px] resize-y bg-white font-sans"
          ></textarea>

          <textarea
            v-model="newQuestion.note"
            placeholder="Enter a note for the question (optional, only for admins)"
            class="p-3 border-2 border-black text-base min-h-[70px] resize-y bg-white font-sans"
          ></textarea>

          <div>
            <h3 class="mb-2.5 text-lg">Answer Options</h3>
            <div v-for="(option, index) in newQuestion.answer_options" :key="index" class="flex gap-2.5 mb-2.5">
              <UiInput
                v-model="option.text"
                :placeholder="`Option ${index + 1}`"
                required
                class="flex-1"
              />
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
                Remove
              </UiButton>
            </div>
            <UiButton variant="secondary" @click="addOption">
              Add Option
            </UiButton>
          </div>

          <UiButton type="submit">Create Question</UiButton>
        </form>
      </UiSection>

      <!-- All Questions -->
      <UiSection>
        <h2 class="mb-5 text-3xl uppercase border-b-[3px] border-black pb-2.5">All Questions</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="question in allQuestions"
            :key="question.id"
            class="bg-gray-100 border-2 border-black p-5"
            :class="{ 'opacity-50': question.alreadyPublished }"
          >
            <p class="font-bold mb-2.5">{{ question.question_text }}</p>
            <p v-if="question.note" class="text-sm text-gray-600 mb-2.5 p-2 bg-gray-200 border border-black">{{ question.note }}</p>
            <ul class="list-disc list-inside p-0 mb-4">
              <li v-for="(option, index) in question.answer_options" :key="index">
                {{ option.text }} <span v-if="option.emoji">{{ option.emoji }}</span>
              </li>
            </ul>
            <UiButton @click="publishQuestion(question.id)">
              Publish This Question
            </UiButton>
          </div>
        </div>
      </UiSection>

      <UiButton @click="handleLogout" variant="secondary">Logout</UiButton>
    </div>
  </div>
</template>
