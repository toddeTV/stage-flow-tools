<script setup lang="ts">
import type { UserQuestion } from '~/types'

const userNickname = ref('')
const nicknameInput = ref('')
const emojiInput = ref('')
const { activeQuestion, selectedAnswer } = useQuizSocket()

// Load nickname from localStorage
onMounted(() => {
  const savedNickname = localStorage.getItem('quiz-nickname')
  if (savedNickname) {
    userNickname.value = savedNickname
  }
})

// Set nickname
function setNickname() {
  if (nicknameInput.value.trim()) {
    userNickname.value = nicknameInput.value.trim()
    localStorage.setItem('quiz-nickname', userNickname.value)
  }
}

// Change nickname
async function changeNickname() {
  if (activeQuestion.value) {
    const userId = localStorage.getItem('quiz-user-id')
    if (userId) {
      try {
        await $fetch('/api/answers/retract', {
          method: 'POST',
          body: {
            user_id: userId,
            question_id: activeQuestion.value.id,
          },
        })
      }
      catch (error) {
        logger_error('Failed to retract answer:', error)
      }
    }
  }
  userNickname.value = ''
  nicknameInput.value = ''
  selectedAnswer.value = ''
  localStorage.removeItem('quiz-nickname')
}

// Fetch active question
const { data: question, refresh: refreshQuestion } = await useFetch<UserQuestion>('/api/questions/active', {
  onResponse({ response }) {
    const questionData = response._data
    if (questionData && !(questionData as any).message) {
      activeQuestion.value = questionData

      // Check if user has already answered
      const savedAnswer = sessionStorage.getItem(`answer-${questionData.id}`)
      if (savedAnswer) {
        selectedAnswer.value = savedAnswer
      }
    }
    else {
      activeQuestion.value = null
      selectedAnswer.value = ''
    }
  },
  onResponseError() {
    activeQuestion.value = null
    selectedAnswer.value = ''
  }
})

// Submit answer
async function submitAnswer() {
  if (!selectedAnswer.value || !activeQuestion.value || activeQuestion.value.is_locked) {
    return
  }

  try {
    const userId = localStorage.getItem('quiz-user-id')
    if (!userId) {
      // This should not happen, but as a fallback
      logger_error('User ID not found')
      return
    }
    await $fetch('/api/answers/submit', {
      method: 'POST',
      body: {
        user_id: userId,
        user_nickname: userNickname.value,
        selected_answer: selectedAnswer.value
      }
    })

    // Save answer in sessionStorage
    sessionStorage.setItem(`answer-${activeQuestion.value.id}`, selectedAnswer.value)
  }
  catch (error: any) {
    logger_error('Failed to submit answer:', error)
    // If locked, reload question
    if (error.statusCode === 403) {
      await refreshQuestion()
    }
  }
}

// Submit emoji
const isEmojiCooldown = ref(false)
const cooldownTimer = ref(0)
let cooldownInterval: NodeJS.Timeout

async function submitEmoji() {
  if (isEmojiCooldown.value || !isValidEmoji(emojiInput.value)) {
    if (!isValidEmoji(emojiInput.value)) {
      alert('Please enter a single emoji.')
    }
    return
  }

  try {
    await $fetch('/api/emojis/submit', {
      method: 'POST',
      body: {
        emoji: emojiInput.value
      }
    })

    // Start cooldown
    isEmojiCooldown.value = true
    cooldownTimer.value = 1.5
    cooldownInterval = setInterval(() => {
      cooldownTimer.value -= 0.01
      if (cooldownTimer.value <= 0) {
        clearInterval(cooldownInterval)
        isEmojiCooldown.value = false
        cooldownTimer.value = 0
      }
    }, 10)
  }
  catch (error) {
    logger_error('Failed to submit emoji:', error)
    alert('Failed to send emoji. Please try again.')
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-5 min-h-screen">
    <UiPageTitle>Quiz Time</UiPageTitle>

    <!-- Nickname Prompt -->
    <div v-if="!userNickname" class="max-w-lg mx-auto bg-white border-[4px] border-black p-10 text-center">
      <h2 class="text-3xl mb-4">Welcome!</h2>
      <p class="mb-8 text-lg">Please enter your nickname to participate</p>
      <form @submit.prevent="setNickname" class="flex flex-col gap-5">
        <UiInput
          v-model="nicknameInput"
          placeholder="Enter your nickname"
          required
          class="text-xl text-center"
        />
        <UiButton type="submit">Join Quiz</UiButton>
      </form>
    </div>

    <!-- With Nickname -->
    <div v-else class="flex flex-col gap-8">
      <!-- Display Nickname with change function -->
      <div class="flex justify-between items-center p-4 bg-white border-[4px] border-black">
        <span>Playing as: <strong class="text-lg">{{ userNickname }}</strong></span>
        <UiButton @click="changeNickname">Change</UiButton>
      </div>

      <!-- Emoji Submission -->
      <div class="bg-white border-[4px] border-black p-6">
        <form @submit.prevent="submitEmoji" class="flex items-center gap-4">
          <UiInput
            v-model="emojiInput"
            placeholder="Send an Emoji..."
            class="text-2xl flex-grow"
          />
          <UiButton type="submit" :disabled="isEmojiCooldown">
            <span v-if="isEmojiCooldown">{{ cooldownTimer.toFixed(2) }}s</span>
            <span v-else>Send</span>
          </UiButton>
        </form>
      </div>

      <!-- Active Question -->
      <div v-if="activeQuestion" class="bg-white border-[4px] border-black p-8">
        <div class="flex justify-between items-center mb-4">
          <UiButton @click="refreshQuestion" variant="secondary" size="small">
            🔄 Refresh
          </UiButton>
          <div v-if="activeQuestion.is_locked" class="py-2 px-4 bg-black text-white uppercase text-sm whitespace-nowrap">
            🔒 Answers Locked
          </div>
        </div>
        <div class="flex justify-between items-start">
          <h2 class="text-2xl leading-tight flex-1">{{ activeQuestion.question_text }}</h2>
        </div>

        <div class="flex flex-col gap-4 mb-5">
          <label
            v-for="(option, index) in activeQuestion.answer_options"
            :key="index"
            class="flex items-center p-5 border-[3px] border-black cursor-pointer transition-all duration-200 relative"
            :class="{
              'bg-black text-white': selectedAnswer === (typeof option === 'string' ? option : option.text),
              'opacity-60 cursor-not-allowed': activeQuestion.is_locked,
              'hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]': !activeQuestion.is_locked
            }"
          >
            <input
              type="radio"
              :value="typeof option === 'string' ? option : option.text"
              v-model="selectedAnswer"
              :disabled="activeQuestion.is_locked"
              @change="submitAnswer"
              class="w-5 h-5 mr-4"
              :class="selectedAnswer === (typeof option === 'string' ? option : option.text) ? 'accent-white' : 'accent-black'"
            />
            <span class="text-lg">{{ typeof option === 'string' ? option : option.text }}</span>
          </label>
        </div>

        <div v-if="selectedAnswer && !activeQuestion.is_locked" class="p-4 bg-gray-100 border-2 border-black text-center text-base">
          ✓ Your answer has been submitted. You can change it until the question is locked.
        </div>

        <div v-if="selectedAnswer && activeQuestion.is_locked" class="p-4 bg-gray-100 border-2 border-black text-center text-base">
          Your answer: <strong class="font-bold">{{ selectedAnswer }}</strong>
        </div>
      </div>

      <!-- No Active Question -->
      <div v-else class="bg-white border-[4px] border-black py-16 px-8 text-center">
        <h2 class="text-3xl mb-4">Waiting for Question</h2>
        <p class="text-xl mb-8">The presenter will start a question soon...</p>
        <div class="flex justify-center gap-2.5">
          <span class="w-4 h-4 bg-black animate-pulse"></span>
          <span class="w-4 h-4 bg-black animate-pulse [animation-delay:0.2s]"></span>
          <span class="w-4 h-4 bg-black animate-pulse [animation-delay:0.4s]"></span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 80%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  40% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 1.4s ease-in-out infinite;
}
</style>
