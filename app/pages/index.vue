<script setup lang="ts">
import type { Question } from '~/types'

const userNickname = ref('')
const nicknameInput = ref('')
const { activeQuestion, selectedAnswer } = useQuizSocket()

// Load nickname from localStorage
onMounted(async () => {
  const saved = localStorage.getItem('quiz-nickname')
  if (saved) {
    userNickname.value = saved
  }

  // Load active question
  await loadQuestion()
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
            question_id: activeQuestion.value.id
          }
        })
      }
      catch (error) {
        console.error('Failed to retract answer:', error)
      }
    }
  }
  userNickname.value = ''
  nicknameInput.value = ''
  selectedAnswer.value = ''
  localStorage.removeItem('quiz-nickname')
}

// Load active question
async function loadQuestion() {
  try {
    const question = await $fetch<Question>('/api/questions')
    if (question && !(question as any).message) {
      activeQuestion.value = question

      // Check if user has already answered
      const savedAnswer = sessionStorage.getItem(`answer-${question.id}`)
      if (savedAnswer) {
        selectedAnswer.value = savedAnswer
      }
    }
    else {
      activeQuestion.value = null
      selectedAnswer.value = ''
    }
  }
  catch (error: unknown) {
    console.error('Failed to load question:', error)
  }
}

// Submit answer
async function submitAnswer() {
  if (!selectedAnswer.value || !activeQuestion.value || activeQuestion.value.is_locked) {
    return
  }

  try {
    const userId = localStorage.getItem('quiz-user-id')
    if (!userId) {
      // This should not happen, but as a fallback
      console.error('User ID not found')
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
    console.error('Failed to submit answer:', error)
    // If locked, reload question
    if (error.statusCode === 403) {
      await loadQuestion()
    }
  }
}

</script>

<template>
  <div class="max-w-3xl mx-auto p-5 min-h-screen">
    <h1 class="text-center text-5xl mb-10 uppercase tracking-widest border-b-5 border-black pb-5">Quiz Time</h1>

    <!-- Nickname Prompt -->
    <div v-if="!userNickname" class="max-w-lg mx-auto bg-white border-[4px] border-black p-10 text-center">
      <h2 class="text-3xl mb-4">Welcome!</h2>
      <p class="mb-8 text-lg">Please enter your nickname to participate</p>
      <form @submit.prevent="setNickname" class="flex flex-col gap-5">
        <input
          v-model="nicknameInput"
          type="text"
          placeholder="Enter your nickname"
          required
          class="p-4 border-[3px] border-black text-xl text-center bg-white"
        />
        <button type="submit" class="p-4 bg-black text-white border-none text-xl uppercase cursor-pointer transition-all duration-300 hover:bg-white hover:text-black hover:shadow-inner-black-lg">Join Quiz</button>
      </form>
    </div>

    <!-- Quiz Section -->
    <div v-else class="flex flex-col gap-8">
      <div class="flex justify-between items-center p-4 bg-white border-[3px] border-black">
        <span>Playing as: <strong class="text-lg">{{ userNickname }}</strong></span>
        <button @click="changeNickname" class="py-2 px-4 bg-black text-white border-none cursor-pointer uppercase hover:bg-white hover:text-black hover:shadow-inner-black">Change</button>
      </div>

      <!-- Active Question -->
      <div v-if="activeQuestion" class="bg-white border-[4px] border-black p-8">
        <div class="flex justify-between items-start mb-8">
          <h2 class="text-2xl leading-tight flex-1">{{ activeQuestion.question_text }}</h2>
          <div v-if="activeQuestion.is_locked" class="py-2 px-4 bg-black text-white uppercase text-sm whitespace-nowrap">
            🔒 Answers Locked
          </div>
        </div>

        <div class="flex flex-col gap-4 mb-5">
          <label
            v-for="(option, index) in activeQuestion.answer_options"
            :key="index"
            class="flex items-center p-5 border-[3px] border-black bg-white cursor-pointer transition-all duration-200 relative"
            :class="{
              'bg-black text-white': selectedAnswer === option,
              'opacity-60 cursor-not-allowed': activeQuestion.is_locked,
              'hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]': !activeQuestion.is_locked
            }"
          >
            <input
              type="radio"
              :value="option"
              v-model="selectedAnswer"
              :disabled="activeQuestion.is_locked"
              @change="submitAnswer"
              class="w-5 h-5 mr-4"
              :class="selectedAnswer === option ? 'accent-white' : 'accent-black'"
            />
            <span class="text-lg">{{ option }}</span>
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

      <div class="flex justify-center gap-5 mt-8">
        <button @click="loadQuestion" class="inline-block py-4 px-8 bg-white text-black border-[3px] border-black no-underline uppercase text-lg transition-all duration-300 cursor-pointer hover:bg-black hover:text-white hover:-translate-y-1 hover:shadow-[0_5px_0_#000]">
          Refresh
        </button>
        <NuxtLink to="/results" class="inline-block py-4 px-8 bg-white text-black border-[3px] border-black no-underline uppercase text-lg transition-all duration-300 cursor-pointer hover:bg-black hover:text-white hover:-translate-y-1 hover:shadow-[0_5px_0_#000]">
          View Live Results →
        </NuxtLink>
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
