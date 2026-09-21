<script setup lang="ts">
import type { Question } from '~/types'
import { useQuizParticipant } from '~/composables/useQuizParticipant'

definePageMeta({
  layout: 'default',
  // middleware: '',
  footer: true,
  background: true,
  localeSwitcher: true,
})

const { activeQuestion, selectedAnswer } = useQuizSocket()
const { data: _question, refresh: refreshQuestion } = await useFetch<Question>('/api/questions/active', {
  onResponse({ response }) {
    const questionData = response._data
    if (questionData && !('message' in questionData)) {
      activeQuestion.value = questionData

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
const {
  answerError,
  changeNickname,
  cooldownTimerInSec,
  emojiError,
  emojiInput,
  getLocalizedText,
  isEmojiCooldown,
  nicknameError,
  nicknameInput,
  quickEmojis,
  sendQuickEmoji,
  setNickname,
  submitAnswer,
  submitEmoji,
  t,
  userNickname,
} = useQuizParticipant({
  activeQuestion,
  refreshQuestion,
  selectedAnswer,
})
</script>

<template>
  <div class="mx-auto w-full max-w-3xl flex-1 p-5">
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
          :aria-describedby="nicknameError ? 'nickname-error' : undefined"
          :aria-invalid="Boolean(nicknameError)"
          class="text-center text-xl"
          :placeholder="t('nicknamePlaceholder')"
          required
        />
        <p v-if="nicknameError" id="nickname-error" role="alert">
          {{ nicknameError }}
        </p>
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
              :aria-describedby="emojiError ? 'emoji-error' : undefined"
              :aria-invalid="Boolean(emojiError)"
              class="size-16 shrink-0 border-r-0 text-center text-2xl"
              placeholder="?"
            />
            <UiButton class="h-16" :disabled="isEmojiCooldown" type="submit">
              <span v-if="isEmojiCooldown">{{ cooldownTimerInSec.toFixed(2) }}s</span>
              <span v-else>{{ t('sendButton') }}</span>
            </UiButton>
            <p
              v-if="emojiError"
              id="emoji-error"
              class="sr-only"
              role="alert"
            >
              {{ emojiError }}
            </p>
          </form>
        </div>
      </div>

      <!-- Active Question -->
      <div v-if="activeQuestion" class="min-w-0 border-4 border-black bg-white p-8">
        <div class="mb-4 flex items-center justify-between">
          <UiButton size="small" variant="secondary" @click="refreshQuestion">
            🔄 {{ t('refreshButton') }}
          </UiButton>
          <div
            v-if="activeQuestion.is_locked"
            class="bg-black px-4 py-2 text-sm whitespace-nowrap
              text-white uppercase"
          >
            🔒 {{ t('answersLocked') }}
          </div>
        </div>
        <div class="flex items-start justify-between">
          <h2 class="min-w-0 flex-1 text-2xl leading-tight">
            <QuizMarkdownText :text="getLocalizedText(activeQuestion.question_text)" />
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
            <QuizMarkdownText :text="getLocalizedText(option.text)" />
          </UiRadioOption>
        </div>

        <div v-if="selectedAnswer !== null && !activeQuestion.is_locked" class="answer-banner">
          ✓ {{ t('answerSubmitted') }}
        </div>

        <p v-if="answerError" class="mt-4" role="alert">
          {{ answerError }}
        </p>

        <div v-if="selectedAnswer !== null && activeQuestion.is_locked" class="answer-banner">
          {{ t('yourAnswer') }}
          <strong class="mt-1 block min-w-0 font-bold">
            <QuizMarkdownText :text="getLocalizedText(activeQuestion.answer_options[selectedAnswer]?.text)" />
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
fr:
  pageTitle: Heure du quiz
  welcome: Bienvenue !
  enterNicknamePrompt: Veuillez saisir votre pseudonyme pour participer
  nicknamePlaceholder: Saisissez votre pseudonyme
  joinButton: Rejoindre le quiz
  playingAs: "Vous jouez en tant que :"
  changeButton: Modifier
  sendButton: Envoyer
  refreshButton: Actualiser
  answersLocked: Réponses verrouillées
  answerSubmitted: Votre réponse a été envoyée. Vous pouvez la modifier jusqu'au verrouillage de la question.
  yourAnswer: "Votre réponse :"
  waitingForQuestion: En attente d'une question
  presenterWillStart: Le présentateur lancera bientôt une question...
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
</i18n>

<style scoped>
@reference "../assets/css/main.css";

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
