import { safeParse } from 'valibot'
import type { Ref } from 'vue'
import type { Question } from '~/types'

type UseQuizParticipantOptions = {
  activeQuestion: Ref<Question | null>
  refreshQuestion: () => Promise<unknown>
  selectedAnswer: Ref<number | null>
}

/** Owns participant identity, answer submission, and emoji-reaction state. */
export function useQuizParticipant({
  activeQuestion,
  refreshQuestion,
  selectedAnswer,
}: UseQuizParticipantOptions) {
  const userNickname = ref('')
  const nicknameInput = ref('')
  const emojiInput = ref('')
  const answerError = ref('')
  const emojiError = ref('')
  const nicknameError = ref('')
  const { t } = useI18n()
  const { getLocalizedText } = useLocalization()
  const {
    getErrorCode,
    getErrorMessage,
    getIssueMessage,
  } = useApiError()

  onMounted(() => {
    const savedNickname = localStorage.getItem('quiz-nickname')
    if (savedNickname) {
      userNickname.value = savedNickname
    }
  })

  function setNickname() {
    nicknameError.value = ''

    const result = safeParse(NicknameSchema, nicknameInput.value)

    if (!result.success) {
      nicknameError.value = getIssueMessage(getValidationIssues(result.issues)[0]!)
      return
    }

    userNickname.value = result.output
    localStorage.setItem('quiz-nickname', userNickname.value)
  }

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

  async function submitAnswer() {
    if (selectedAnswer.value === null || !activeQuestion.value || activeQuestion.value.is_locked) {
      return
    }

    answerError.value = ''

    try {
      const userId = localStorage.getItem('quiz-user-id')
      if (!userId) {
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

      sessionStorage.setItem(`answer-${activeQuestion.value.id}`, selectedAnswer.value.toString())
    }
    catch (error: unknown) {
      logger_error('Failed to submit answer:', error)
      answerError.value = getErrorMessage(error)
      if (getErrorCode(error) === 'quiz.question_locked') {
        await refreshQuestion()
      }
    }
  }

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
    if (isEmojiCooldown.value) {
      return
    }

    emojiError.value = ''

    const result = safeParse(EmojiSchema, emojiInput.value)

    if (!result.success) {
      emojiError.value = getIssueMessage(getValidationIssues(result.issues)[0]!)
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
          emoji: result.output,
          user_id: userId,
        },
      })

      const config = useRuntimeConfig()
      const cooldownMs = config.public.emojiCooldownMs

      isEmojiCooldown.value = true
      cooldownEndTime = Date.now() + cooldownMs
      cooldownTimerInSec.value = cooldownMs / 1000
      resume()
    }
    catch (error) {
      logger_error('Failed to submit emoji:', error)
      alert(getErrorMessage(error))
    }
  }

  const quickEmojis = [
    '👍',
    '❤️',
    '😂',
    '🤔',
    '👏',
    '🥁',
    '❓',
  ]

  async function sendQuickEmoji(emoji: string) {
    if (isEmojiCooldown.value) return
    emojiInput.value = emoji
    await submitEmoji()
  }

  return {
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
  }
}
