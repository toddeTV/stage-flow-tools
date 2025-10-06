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
  <div class="quiz-container">
    <h1 class="page-title">Quiz Time</h1>
    
    <!-- Nickname Prompt -->
    <div v-if="!userNickname" class="nickname-section">
      <h2>Welcome!</h2>
      <p>Please enter your nickname to participate</p>
      <form @submit.prevent="setNickname" class="nickname-form">
        <input
          v-model="nicknameInput"
          type="text"
          placeholder="Enter your nickname"
          required
        />
        <button type="submit">Join Quiz</button>
      </form>
    </div>
    
    <!-- Quiz Section -->
    <div v-else class="quiz-section">
      <div class="user-info">
        <span>Playing as: <strong>{{ userNickname }}</strong></span>
        <button @click="changeNickname" class="change-btn">Change</button>
      </div>
      
      <!-- Active Question -->
      <div v-if="activeQuestion" class="question-container">
        <div class="question-header">
          <h2>{{ activeQuestion.question_text }}</h2>
          <div v-if="activeQuestion.is_locked" class="lock-indicator">
            🔒 Answers Locked
          </div>
        </div>
        
        <div class="answer-options">
          <label
            v-for="(option, index) in activeQuestion.answer_options"
            :key="index"
            class="answer-option"
            :class="{ selected: selectedAnswer === option, disabled: activeQuestion.is_locked }"
          >
            <input
              type="radio"
              :value="option"
              v-model="selectedAnswer"
              :disabled="activeQuestion.is_locked"
              @change="submitAnswer"
            />
            <span>{{ option }}</span>
          </label>
        </div>
        
        <div v-if="selectedAnswer && !activeQuestion.is_locked" class="status-message">
          ✓ Your answer has been submitted. You can change it until the question is locked.
        </div>
        
        <div v-if="selectedAnswer && activeQuestion.is_locked" class="status-message">
          Your answer: <strong>{{ selectedAnswer }}</strong>
        </div>
      </div>
      
      <!-- No Active Question -->
      <div v-else class="no-question">
        <h2>Waiting for Question</h2>
        <p>The presenter will start a question soon...</p>
        <div class="waiting-animation">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <div class="navigation">
        <button @click="loadQuestion" class="refresh-btn">
          Refresh
        </button>
        <NuxtLink to="/results" class="view-results-btn">
          View Live Results →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.page-title {
  text-align: center;
  font-size: 3rem;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 3px;
  border-bottom: 5px solid #000;
  padding-bottom: 20px;
}

/* Nickname Section */
.nickname-section {
  max-width: 500px;
  margin: 0 auto;
  background: #fff;
  border: 4px solid #000;
  padding: 40px;
  text-align: center;
}

.nickname-section h2 {
  font-size: 2rem;
  margin-bottom: 15px;
}

.nickname-section p {
  margin-bottom: 30px;
  font-size: 1.1rem;
}

.nickname-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.nickname-form input {
  padding: 15px;
  border: 3px solid #000;
  font-size: 1.2rem;
  text-align: center;
  background: #fff;
}

.nickname-form button {
  padding: 15px;
  background: #000;
  color: #fff;
  border: none;
  font-size: 1.2rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
}

.nickname-form button:hover {
  background: #fff;
  color: #000;
  box-shadow: inset 0 0 0 3px #000;
}

/* Quiz Section */
.quiz-section {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #fff;
  border: 3px solid #000;
}

.user-info strong {
  font-size: 1.2rem;
}

.change-btn {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
}

.change-btn:hover {
  background: #fff;
  color: #000;
  box-shadow: inset 0 0 0 2px #000;
}

/* Question Container */
.question-container {
  background: #fff;
  border: 4px solid #000;
  padding: 30px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
}

.question-header h2 {
  font-size: 1.5rem;
  line-height: 1.4;
  flex: 1;
}

.lock-indicator {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  text-transform: uppercase;
  font-size: 0.9rem;
  white-space: nowrap;
}

/* Answer Options */
.answer-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.answer-option {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 3px solid #000;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.answer-option:hover:not(.disabled) {
  transform: translateX(5px);
  box-shadow: -5px 5px 0 #000;
}

.answer-option.selected {
  background: #000;
  color: #fff;
}

.answer-option.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.answer-option.disabled:hover {
  transform: none;
  box-shadow: none;
}

.answer-option input[type="radio"] {
  width: 20px;
  height: 20px;
  margin-right: 15px;
  accent-color: #000;
}

.answer-option.selected input[type="radio"] {
  accent-color: #fff;
}

.answer-option span {
  font-size: 1.1rem;
}

/* Status Message */
.status-message {
  padding: 15px;
  background: #f5f5f5;
  border: 2px solid #000;
  text-align: center;
  font-size: 1rem;
}

.status-message strong {
  font-weight: bold;
}

/* No Question */
.no-question {
  background: #fff;
  border: 4px solid #000;
  padding: 60px 30px;
  text-align: center;
}

.no-question h2 {
  font-size: 2rem;
  margin-bottom: 15px;
}

.no-question p {
  font-size: 1.2rem;
  margin-bottom: 30px;
}

/* Waiting Animation */
.waiting-animation {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.waiting-animation span {
  width: 15px;
  height: 15px;
  background: #000;
  animation: pulse 1.4s ease-in-out infinite;
}

.waiting-animation span:nth-child(2) {
  animation-delay: 0.2s;
}

.waiting-animation span:nth-child(3) {
  animation-delay: 0.4s;
}

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

/* Navigation */
.navigation {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.view-results-btn,
.refresh-btn {
  display: inline-block;
  padding: 15px 30px;
  background: #fff;
  color: #000;
  border: 3px solid #000;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 1.1rem;
  transition: all 0.3s;
  cursor: pointer;
}

.view-results-btn:hover,
.refresh-btn:hover {
  background: #000;
  color: #fff;
  transform: translateY(-3px);
  box-shadow: 0 5px 0 #000;
}
</style>
