<script setup lang="ts">
import type { Question } from '~/types'

const userNickname = ref('')
const nicknameInput = ref('')
const emojiInput = ref('')
const { activeQuestion, selectedAnswer } = useQuizSocket()
const { t } = useI18n()
const { getLocalizedText } = useLocalization()

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
const { data: question, refresh: refreshQuestion } = await useFetch<Question>('/api/questions/active', {
  onResponse({ response }) {
    const questionData = response._data
    if (questionData && !('message' in questionData)) {
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
        selected_answer: activeQuestion.value.answer_options.find(o => o.text.en === selectedAnswer.value)?.text,
      }
    })

    // Save answer in sessionStorage
    sessionStorage.setItem(`answer-${activeQuestion.value.id}`, selectedAnswer.value)
  }
  catch (error: unknown) {
    logger_error('Failed to submit answer:', error)
    // If locked, reload question
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 403) {
      await refreshQuestion()
    }
  }
}

// Submit emoji
const isEmojiCooldown = ref(false)
const cooldownTimerInSec = ref(0)
let cooldownEndTime = 0

const { pause, resume } = useIntervalFn(() => {
  const remaining = cooldownEndTime - Date.now()
  if (remaining <= 0) {
    isEmojiCooldown.value = false
    cooldownTimerInSec.value = 0
    pause()
  }
  else {
    cooldownTimerInSec.value = remaining / 1000
  }
}, 10, { immediate: false })

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
        emoji: emojiInput.value,
        user_id: localStorage.getItem('quiz-user-id')
      }
    })

    // Start cooldown
    const config = useRuntimeConfig()
    const cooldownMs = config.public.emojiCooldownMs

    isEmojiCooldown.value = true
    cooldownEndTime = Date.now() + cooldownMs
    cooldownTimerInSec.value = cooldownMs / 1000
    resume()
  }
  catch (error) {
    logger_error('Failed to submit emoji:', error)
    alert('Failed to send emoji. Please try again.')
  }
}

const quickEmojis = ['👍', '❤️', '😂', '🤔', '👏', '❓']

async function sendQuickEmoji(emoji: string) {
  if (isEmojiCooldown.value) return
  emojiInput.value = emoji
  await submitEmoji()
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-5 min-h-screen">
    <UiPageTitle>{{ t('pageTitle') }}</UiPageTitle>

    <!-- Nickname Prompt -->
    <div v-if="!userNickname" class="max-w-lg mx-auto bg-white border-[4px] border-black p-10 text-center">
      <h2 class="text-3xl mb-4">{{ t('welcome') }}</h2>
      <p class="mb-8 text-lg">{{ t('enterNicknamePrompt') }}</p>
      <form @submit.prevent="setNickname" class="flex flex-col gap-5">
        <UiInput
          v-model="nicknameInput"
          :placeholder="t('nicknamePlaceholder')"
          required
          class="text-xl text-center"
        />
        <UiButton type="submit">{{ t('joinButton') }}</UiButton>
      </form>
    </div>

    <!-- With Nickname -->
    <div v-else class="flex flex-col gap-8">
      <!-- Display Nickname with change function -->
      <div class="flex justify-between items-center p-4 bg-white border-[4px] border-black">
        <span>{{ t('playingAs') }} <strong class="text-lg">{{ userNickname }}</strong></span>
        <UiButton @click="changeNickname">{{ t('changeButton') }}</UiButton>
      </div>

      <!-- Emoji Submission -->
      <div class="bg-white border-[4px] border-black p-6">
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button
            v-for="emoji in quickEmojis"
            :key="emoji"
            class="p-2 text-3xl border-2 border-black bg-white transition-transform duration-150 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isEmojiCooldown"
            @click="sendQuickEmoji(emoji)"
          >
            {{ emoji }}
          </button>
          <form @submit.prevent="submitEmoji" class="flex items-center">
            <UiInput
              v-model="emojiInput"
              placeholder="?"
              class="text-2xl text-center w-16 h-16 flex-shrink-0 border-r-0"
            />
            <UiButton type="submit" :disabled="isEmojiCooldown" class="h-16">
              <span v-if="isEmojiCooldown">{{ cooldownTimerInSec.toFixed(2) }}s</span>
              <span v-else>{{ t('sendButton') }}</span>
            </UiButton>
          </form>
        </div>
      </div>

      <!-- Active Question -->
      <div v-if="activeQuestion" class="bg-white border-[4px] border-black p-8">
        <div class="flex justify-between items-center mb-4">
          <UiButton @click="refreshQuestion" variant="secondary" size="small">
            🔄 {{ t('refreshButton') }}
          </UiButton>
          <div v-if="activeQuestion.is_locked" class="py-2 px-4 bg-black text-white uppercase text-sm whitespace-nowrap">
            🔒 {{ t('answersLocked') }}
          </div>
        </div>
        <div class="flex justify-between items-start">
          <h2 class="text-2xl leading-tight flex-1">{{ getLocalizedText(activeQuestion.question_text) }}</h2>
        </div>

        <div class="flex flex-col gap-4 mb-5">
          <UiRadioOption
            v-for="(option, index) in activeQuestion.answer_options"
            :key="index"
            v-model="selectedAnswer"
            :value="option.text.en"
            :disabled="activeQuestion.is_locked"
            @update:modelValue="submitAnswer"
          >
            {{ getLocalizedText(option.text) }}
          </UiRadioOption>
        </div>

        <div v-if="selectedAnswer && !activeQuestion.is_locked" class="p-4 bg-gray-100 border-2 border-black text-center text-base">
          ✓ {{ t('answerSubmitted') }}
        </div>

        <div v-if="selectedAnswer && activeQuestion.is_locked" class="p-4 bg-gray-100 border-2 border-black text-center text-base">
          {{ t('yourAnswer') }} <strong class="font-bold">{{ getLocalizedText(activeQuestion.answer_options.find(o => o.text.en === selectedAnswer)?.text) }}</strong>
        </div>
      </div>

      <!-- No Active Question -->
      <div v-else class="bg-white border-[4px] border-black py-16 px-8 text-center">
        <h2 class="text-3xl mb-4">{{ t('waitingForQuestion') }}</h2>
        <p class="text-xl mb-8">{{ t('presenterWillStart') }}</p>
        <div class="flex justify-center gap-2.5">
          <span class="w-4 h-4 bg-black animate-pulse"></span>
          <span class="w-4 h-4 bg-black animate-pulse [animation-delay:0.2s]"></span>
          <span class="w-4 h-4 bg-black animate-pulse [animation-delay:0.4s]"></span>
        </div>
      </div>

    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  pageTitle: "Quiz Time"
  welcome: "Welcome!"
  enterNicknamePrompt: "Please enter your nickname to participate"
  nicknamePlaceholder: "Enter your nickname"
  joinButton: "Join Quiz"
  playingAs: "Playing as:"
  changeButton: "Change"
  sendButton: "Send"
  refreshButton: "Refresh"
  answersLocked: "Answers Locked"
  answerSubmitted: "Your answer has been submitted. You can change it until the question is locked."
  yourAnswer: "Your answer:"
  waitingForQuestion: "Waiting for Question"
  presenterWillStart: "The presenter will start a question soon..."
de:
  pageTitle: "Quiz-Zeit"
  welcome: "Willkommen!"
  enterNicknamePrompt: "Bitte gib deinen Spitznamen ein, um teilzunehmen"
  nicknamePlaceholder: "Spitznamen eingeben"
  joinButton: "Quiz beitreten"
  playingAs: "Spielt als:"
  changeButton: "Ändern"
  sendButton: "Senden"
  refreshButton: "Aktualisieren"
  answersLocked: "Antworten gesperrt"
  answerSubmitted: "Deine Antwort wurde übermittelt. Du kannst sie ändern, bis die Frage gesperrt wird."
  yourAnswer: "Deine Antwort:"
  waitingForQuestion: "Warten auf Frage"
  presenterWillStart: "Der Moderator wird bald eine Frage starten..."
ja:
  pageTitle: "クイズタイム"
  welcome: "ようこそ！"
  enterNicknamePrompt: "参加するにはニックネームを入力してください"
  nicknamePlaceholder: "ニックネームを入力"
  joinButton: "クイズに参加"
  playingAs: "プレイヤー："
  changeButton: "変更"
  sendButton: "送信"
  refreshButton: "更新"
  answersLocked: "回答はロックされています"
  answerSubmitted: "回答が送信されました。質問がロックされるまで変更できます。"
  yourAnswer: "あなたの答え："
  waitingForQuestion: "質問を待っています"
  presenterWillStart: "プレゼンターがまもなく質問を開始します..."
</i18n>

<style scoped>
@reference "tailwindcss";

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
