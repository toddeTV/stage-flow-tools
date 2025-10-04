<script setup lang="ts">
import type { Question } from '~/types'

const isAuthenticated = ref(false)
const loginForm = ref({ username: '', password: '' })
const loginError = ref('')
const activeQuestion = ref<Question | null>(null)
const preparedQuestions = ref<Question[]>([])
const newQuestion = ref({
  question_text: '',
  answer_options: ['', '']
})

// Check authentication status
onMounted(async () => {
  const token = useCookie('admin-token').value
  if (token) {
    try {
      await $fetch('/api/auth/verify')
      isAuthenticated.value = true
      await loadQuestions()
    }
    catch (error: unknown) {
      isAuthenticated.value = false
    }
  }
})

// Load questions
async function loadQuestions() {
  try {
    // Get active question
    const active = await $fetch<Question>('/api/questions')
    if (active && !(active as any).message) {
      activeQuestion.value = active
    }
  }
  catch (error: unknown) {
    console.error('Failed to load questions:', error)
  }
}

// Login handler
async function handleLogin() {
  try {
    loginError.value = ''
    const { token } = await $fetch<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: loginForm.value
    })

    // Set cookie
    const cookie = useCookie('admin-token')
    cookie.value = token

    isAuthenticated.value = true
    await loadQuestions()
  }
  catch (error: any) {
    loginError.value = error.data?.statusMessage || 'Login failed'
  }
}

// Logout handler
function handleLogout() {
  const cookie = useCookie('admin-token')
  cookie.value = null
  isAuthenticated.value = false
  navigateTo('/')
}

// Create question
async function handleCreateQuestion() {
  try {
    // Filter out empty options
    const filteredOptions = newQuestion.value.answer_options.filter(opt => opt.trim())

    if (filteredOptions.length < 2) {
      alert('At least 2 answer options required')
      return
    }

    const question = await $fetch<Question>('/api/questions/create', {
      method: 'POST',
      body: {
        question_text: newQuestion.value.question_text,
        answer_options: filteredOptions
      }
    })

    preparedQuestions.value.push(question)

    // Reset form
    newQuestion.value = {
      question_text: '',
      answer_options: ['', '']
    }

    alert('Question created successfully')
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
    preparedQuestions.value = preparedQuestions.value.filter((q: Question) => q.id !== questionId)

    alert('Question published successfully')
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
  newQuestion.value.answer_options.push('')
}

// Remove option
function removeOption(index: number) {
  newQuestion.value.answer_options.splice(index, 1)
}
</script>

<template>
  <div class="admin-container">
    <h1 class="page-title">Admin Dashboard</h1>
    
    <!-- Login Form -->
    <div v-if="!isAuthenticated" class="login-section">
      <h2>Admin Login</h2>
      <form @submit.prevent="handleLogin" class="login-form">
        <input
          v-model="loginForm.username"
          type="text"
          placeholder="Username"
          required
        />
        <input
          v-model="loginForm.password"
          type="password"
          placeholder="Password"
          required
        />
        <button type="submit">Login</button>
        <div v-if="loginError" class="error">{{ loginError }}</div>
      </form>
    </div>
    
    <!-- Dashboard -->
    <div v-else class="dashboard">
      <!-- Current Question -->
      <section class="current-question">
        <h2>Current Active Question</h2>
        <div v-if="activeQuestion" class="question-display">
          <p class="question-text">{{ activeQuestion.question_text }}</p>
          <ul class="answer-list">
            <li v-for="(option, index) in activeQuestion.answer_options" :key="index">
              {{ option }}
            </li>
          </ul>
          <div class="question-status">
            <span>Status: {{ activeQuestion.is_locked ? 'Locked' : 'Unlocked' }}</span>
            <button @click="toggleLock">
              {{ activeQuestion.is_locked ? 'Unlock' : 'Lock' }} Question
            </button>
          </div>
        </div>
        <div v-else class="no-question">
          No active question
        </div>
      </section>
      
      <!-- New Question Form -->
      <section class="new-question">
        <h2>Prepare Next Question</h2>
        <form @submit.prevent="handleCreateQuestion" class="question-form">
          <textarea
            v-model="newQuestion.question_text"
            placeholder="Enter question text"
            required
          ></textarea>
          
          <div class="answer-options">
            <h3>Answer Options</h3>
            <div v-for="(option, index) in newQuestion.answer_options" :key="index" class="option-input">
              <input
                v-model="newQuestion.answer_options[index]"
                type="text"
                :placeholder="`Option ${index + 1}`"
                required
              />
              <button
                v-if="newQuestion.answer_options.length > 2"
                type="button"
                @click="removeOption(index)"
                class="remove-btn"
              >
                Remove
              </button>
            </div>
            <button type="button" @click="addOption" class="add-option">
              Add Option
            </button>
          </div>
          
          <button type="submit" class="submit-btn">Create Question</button>
        </form>
      </section>
      
      <!-- Prepared Questions -->
      <section v-if="preparedQuestions.length > 0" class="prepared-questions">
        <h2>Prepared Questions</h2>
        <div v-for="question in preparedQuestions" :key="question.id" class="prepared-question">
          <p>{{ question.question_text }}</p>
          <ul>
            <li v-for="(option, index) in question.answer_options" :key="index">
              {{ option }}
            </li>
          </ul>
          <button @click="publishQuestion(question.id)" class="publish-btn">
            Publish This Question
          </button>
        </div>
      </section>
      
      <button @click="handleLogout" class="logout-btn">Logout</button>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* Login Section */
.login-section {
  max-width: 400px;
  margin: 0 auto;
  background: #fff;
  border: 3px solid #000;
  padding: 30px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login-form input {
  padding: 12px;
  border: 2px solid #000;
  font-size: 1rem;
  background: #fff;
}

.login-form button {
  padding: 12px;
  background: #000;
  color: #fff;
  border: none;
  font-size: 1rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
}

.login-form button:hover {
  background: #fff;
  color: #000;
  box-shadow: inset 0 0 0 2px #000;
}

.error {
  color: #000;
  background: #fff;
  border: 2px solid #000;
  padding: 10px;
  text-align: center;
}

/* Dashboard */
.dashboard {
  display: grid;
  gap: 30px;
}

section {
  background: #fff;
  border: 3px solid #000;
  padding: 30px;
}

h2 {
  margin-bottom: 20px;
  font-size: 1.8rem;
  text-transform: uppercase;
  border-bottom: 3px solid #000;
  padding-bottom: 10px;
}

/* Current Question */
.question-display {
  background: #f5f5f5;
  border: 2px solid #000;
  padding: 20px;
}

.question-text {
  font-size: 1.2rem;
  margin-bottom: 15px;
  font-weight: bold;
}

.answer-list {
  list-style: none;
  padding: 0;
  margin-bottom: 20px;
}

.answer-list li {
  padding: 10px;
  background: #fff;
  border: 1px solid #000;
  margin-bottom: 5px;
}

.question-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-status button {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
}

.question-status button:hover {
  background: #fff;
  color: #000;
  box-shadow: inset 0 0 0 2px #000;
}

.no-question {
  padding: 40px;
  text-align: center;
  background: #f5f5f5;
  border: 2px dashed #000;
}

/* Question Form */
.question-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-form textarea {
  padding: 12px;
  border: 2px solid #000;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  background: #fff;
  font-family: inherit;
}

.answer-options h3 {
  margin-bottom: 10px;
  font-size: 1.2rem;
}

.option-input {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.option-input input {
  flex: 1;
  padding: 10px;
  border: 2px solid #000;
  background: #fff;
  font-size: 1rem;
}

.remove-btn {
  padding: 10px 20px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
}

.remove-btn:hover {
  background: #fff;
  color: #000;
  box-shadow: inset 0 0 0 2px #000;
}

.add-option {
  padding: 10px 20px;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  cursor: pointer;
  text-transform: uppercase;
  align-self: flex-start;
}

.add-option:hover {
  background: #000;
  color: #fff;
}

.submit-btn {
  padding: 15px;
  background: #000;
  color: #fff;
  border: none;
  font-size: 1.1rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover {
  background: #fff;
  color: #000;
  box-shadow: inset 0 0 0 3px #000;
}

/* Prepared Questions */
.prepared-question {
  background: #f5f5f5;
  border: 2px solid #000;
  padding: 20px;
  margin-bottom: 15px;
}

.prepared-question p {
  font-weight: bold;
  margin-bottom: 10px;
}

.prepared-question ul {
  list-style: none;
  padding: 0;
  margin-bottom: 15px;
}

.prepared-question li {
  padding: 8px;
  background: #fff;
  border: 1px solid #000;
  margin-bottom: 5px;
}

.publish-btn {
  padding: 10px 20px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
}

.publish-btn:hover {
  background: #fff;
  color: #000;
  box-shadow: inset 0 0 0 2px #000;
}

/* Logout */
.logout-btn {
  padding: 12px 30px;
  background: #fff;
  color: #000;
  border: 3px solid #000;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 1rem;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #000;
  color: #fff;
}
</style>
