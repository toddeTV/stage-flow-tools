<script setup lang="ts">
import type { Question } from '~/types'

definePageMeta({
  layout: 'default',
  // middleware: '',
  footer: true,
  background: true,
  localeSwitcher: true,
})

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
  selectedAnswer.value = null
  localStorage.removeItem('quiz-nickname')
}

// Fetch active question
const { data: _question, refresh: refreshQuestion } = await useFetch<Question>('/api/questions/active', {
  onResponse({ response }) {
    const questionData = response._data
    if (questionData && !('message' in questionData)) {
      activeQuestion.value = questionData

      // Check if user has already answered
      const savedAnswer = sessionStorage.getItem(`answer-${questionData.id}`)
      if (savedAnswer) {
        selectedAnswer.value = parseInt(savedAnswer, 10)
      }
    }
    else {
      activeQuestion.value = null
      selectedAnswer.value = null
    }
  },
  onResponseError() {
    activeQuestion.value = null
    selectedAnswer.value = null
  },
})

// Submit answer
async function submitAnswer() {
  if (selectedAnswer.value === null || !activeQuestion.value || activeQuestion.value.is_locked) {
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
        selected_answer: activeQuestion.value.answer_options[selectedAnswer.value]?.text,
      },
    })

    // Save answer in sessionStorage
    sessionStorage.setItem(`answer-${activeQuestion.value.id}`, selectedAnswer.value.toString())
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
      alert(t('emojis.singleEmojiRequired'))
    }
    return
  }

  try {
    const userId = localStorage.getItem('quiz-user-id')
    if (!userId) {
      logger_error('User ID not found')
      return
    }

    await $fetch('/api/emojis/submit', {
      method: 'POST',
      body: {
        emoji: emojiInput.value,
        user_id: userId,
      },
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
    alert(t('emojis.failedToSend'))
  }
}

const quickEmojis = [
  '👍',
  '❤️',
  '😂',
  '🤔',
  '👏',
  '❓',
]

async function sendQuickEmoji(emoji: string) {
  if (isEmojiCooldown.value) return
  emojiInput.value = emoji
  await submitEmoji()
}
</script>

<template>
  <div class="mx-auto min-h-screen max-w-3xl p-5">
    <UiPageTitle>{{ t('pageTitle') }}</UiPageTitle>

    <!-- Nickname Prompt -->
    <div v-if="!userNickname" class="mx-auto max-w-lg border-4 border-black bg-white p-10 text-center">
      <h2 class="mb-4 text-3xl">
        {{ t('welcome') }}
      </h2>
      <p class="mb-8 text-lg">
        {{ t('enterNicknamePrompt') }}
      </p>
      <form class="flex flex-col gap-5" @submit.prevent="setNickname">
        <UiInput
          v-model="nicknameInput"
          class="text-center text-xl"
          :placeholder="t('nicknamePlaceholder')"
          required
        />
        <UiButton type="submit">
          {{ t('joinButton') }}
        </UiButton>
      </form>
    </div>

    <!-- With Nickname -->
    <div v-else class="flex flex-col gap-8">
      <!-- Display Nickname with change function -->
      <div class="flex items-center justify-between border-4 border-black bg-white p-4">
        <span>{{ t('playingAs') }} <strong class="text-lg">{{ userNickname }}</strong></span>
        <UiButton @click="changeNickname">
          {{ t('changeButton') }}
        </UiButton>
      </div>

      <!-- Emoji Submission -->
      <div class="border-4 border-black bg-white p-6">
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button
            v-for="emoji in quickEmojis"
            :key="emoji"
            class="border-2 border-black bg-white p-2 text-3xl
              transition-transform duration-150 hover:scale-110
              disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isEmojiCooldown"
            @click="sendQuickEmoji(emoji)"
          >
            {{ emoji }}
          </button>
          <form class="flex items-center" @submit.prevent="submitEmoji">
            <UiInput
              v-model="emojiInput"
              class="size-16 flex-shrink-0 border-r-0 text-center text-2xl"
              placeholder="?"
            />
            <UiButton class="h-16" :disabled="isEmojiCooldown" type="submit">
              <span v-if="isEmojiCooldown">{{ cooldownTimerInSec.toFixed(2) }}s</span>
              <span v-else>{{ t('sendButton') }}</span>
            </UiButton>
          </form>
        </div>
      </div>

      <!-- Active Question -->
      <div v-if="activeQuestion" class="border-4 border-black bg-white p-8">
        <div class="mb-4 flex items-center justify-between">
          <UiButton size="small" variant="secondary" @click="refreshQuestion">
            🔄 {{ t('refreshButton') }}
          </UiButton>
          <div
            v-if="activeQuestion.is_locked"
            class="whitespace-nowrap bg-black px-4 py-2 text-sm
              uppercase text-white"
          >
            🔒 {{ t('answersLocked') }}
          </div>
        </div>
        <div class="flex items-start justify-between">
          <h2 class="flex-1 text-2xl leading-tight">
            {{ getLocalizedText(activeQuestion.question_text) }}
          </h2>
        </div>

        <div class="mb-5 flex flex-col gap-4">
          <UiRadioOption
            v-for="(option, index) in activeQuestion.answer_options"
            :key="index"
            v-model="selectedAnswer"
            :disabled="activeQuestion.is_locked"
            :value="index"
            @update:model-value="submitAnswer"
          >
            {{ getLocalizedText(option.text) }}
          </UiRadioOption>
        </div>

        <div v-if="selectedAnswer !== null && !activeQuestion.is_locked" class="answer-banner">
          ✓ {{ t('answerSubmitted') }}
        </div>

        <div v-if="selectedAnswer !== null && activeQuestion.is_locked" class="answer-banner">
          {{ t('yourAnswer') }}
          <strong class="font-bold">
            {{ getLocalizedText(activeQuestion.answer_options[selectedAnswer]?.text) }}
          </strong>
        </div>
      </div>

      <!-- No Active Question -->
      <div v-else class="border-4 border-black bg-white px-8 py-16 text-center">
        <h2 class="mb-4 text-3xl">
          {{ t('waitingForQuestion') }}
        </h2>
        <p class="mb-8 text-xl">
          {{ t('presenterWillStart') }}
        </p>
        <div class="flex justify-center gap-2.5">
          <span class="size-4 animate-pulse bg-black" />
          <span class="size-4 animate-pulse bg-black [animation-delay:0.2s]" />
          <span class="size-4 animate-pulse bg-black [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  pageTitle: Quiz Time
  welcome: Welcome!
  enterNicknamePrompt: Please enter your nickname to participate
  nicknamePlaceholder: Enter your nickname
  joinButton: Join Quiz
  playingAs: "Playing as:"
  changeButton: Change
  sendButton: Send
  refreshButton: Refresh
  answersLocked: Answers Locked
  answerSubmitted: Your answer has been submitted. You can change it until the question is locked.
  yourAnswer: "Your answer:"
  waitingForQuestion: Waiting for Question
  presenterWillStart: The presenter will start a question soon...
  emojis:
    singleEmojiRequired: Please enter a single emoji.
    failedToSend: Failed to send emoji. Please try again.
de:
  pageTitle: Quiz-Zeit
  welcome: Willkommen!
  enterNicknamePrompt: "Bitte gib deinen Spitznamen ein, um teilzunehmen"
  nicknamePlaceholder: Spitznamen eingeben
  joinButton: Quiz beitreten
  playingAs: "Spielt als:"
  changeButton: Ändern
  sendButton: Senden
  refreshButton: Aktualisieren
  answersLocked: Antworten gesperrt
  answerSubmitted: "Deine Antwort wurde übermittelt. Du kannst sie ändern, bis die Frage gesperrt wird."
  yourAnswer: "Deine Antwort:"
  waitingForQuestion: Warten auf Frage
  presenterWillStart: Der Moderator wird bald eine Frage starten...
  emojis:
    singleEmojiRequired: Bitte geben Sie ein einzelnes Emoji ein.
    failedToSend: Emoji konnte nicht gesendet werden. Bitte versuchen Sie es erneut.
ja:
  pageTitle: クイズタイム
  welcome: ようこそ！
  enterNicknamePrompt: 参加するにはニックネームを入力してください
  nicknamePlaceholder: ニックネームを入力
  joinButton: クイズに参加
  playingAs: プレイヤー：
  changeButton: 変更
  sendButton: 送信
  refreshButton: 更新
  answersLocked: 回答はロックされています
  answerSubmitted: 回答が送信されました。質問がロックされるまで変更できます。
  yourAnswer: あなたの答え：
  waitingForQuestion: 質問を待っています
  presenterWillStart: プレゼンターがまもなく質問を開始します...
  emojis:
    singleEmojiRequired: 単一の絵文字を入力してください。
    failedToSend: 絵文字の送信に失敗しました。もう一度お試しください。
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

.answer-banner {
  @apply border-2 border-black bg-gray-100 p-4 text-center text-base;
}
</style>
