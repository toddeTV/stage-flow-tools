import { safeParse } from 'valibot'
import type { QuizAnswerOptions } from './useQuizAnswers'
import { useQuizAnswers } from './useQuizAnswers'

type UseQuizParticipantOptions = QuizAnswerOptions & {
  clearStoredAnswer: (questionId: string) => void
}

/** Owns participant identity, answer submission, and emoji-reaction state. */
export function useQuizParticipant(options: UseQuizParticipantOptions) {
  const { activeQuestion, clearStoredAnswer } = options
  const userNickname = ref('')
  const nicknameInput = ref('')
  const emojiInput = ref('')
  const emojiError = ref('')
  const nicknameError = ref('')
  const retractions = new Map<string, Promise<void>>()
  const { t } = useI18n()
  const { getLocalizedText } = useLocalization()
  const {
    getErrorMessage,
    getIssueMessage,
  } = useApiError()
  const {
    answerError,
    answerPending,
    invalidateAnswers,
    submitAnswer,
    waitForInFlightSubmission,
  } = useQuizAnswers(options, userNickname, retractions)

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
    const questionId = activeQuestion.value?.id
    const userId = localStorage.getItem('quiz-user-id')
    invalidateAnswers()
    if (questionId) {
      clearStoredAnswer(questionId)
    }
    const retraction = questionId && userId ? queueRetraction(questionId, userId) : undefined
    userNickname.value = ''
    nicknameInput.value = ''
    localStorage.removeItem('quiz-nickname')
    await retraction
  }

  /** Orders repeated retractions and holds replacement submissions until they settle. */
  async function queueRetraction(questionId: string, userId: string) {
    const previous = retractions.get(questionId)
    const submission = waitForInFlightSubmission(questionId)
    const request = (async () => {
      await Promise.all([
        previous,
        submission,
      ])
      try {
        await $fetch('/api/answers/retract', {
          method: 'POST',
          body: {
            user_id: userId,
            question_id: questionId,
          },
        })
      }
      catch (error) {
        logger_error('Failed to retract answer:', error)
      }
    })()
    retractions.set(questionId, request)
    try {
      await request
    }
    finally {
      if (retractions.get(questionId) === request) retractions.delete(questionId)
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
    answerPending,
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
