import type { Ref } from 'vue'
import type { LocalizedString, Question } from '~/types'

export type QuizAnswerOptions = {
  activeQuestion: Ref<Question | null>
  selectedAnswer: Ref<number | null>
  confirmedAnswer: Ref<number | null>
  answerReset: Ref<{ questionId: string } | null>
  refreshQuestion: () => Promise<unknown>
}

type Submission = {
  question_id: string
  selected_answer: LocalizedString
  user_id: string
  user_nickname: string
  index: number
}

type AnswerQueue = {
  version: number
  pending: Submission | null
  running: Promise<void> | null
  inFlight: Promise<unknown> | null
}

/** Serializes optimistic writes per question and keeps stale responses out of visible state. */
export function useQuizAnswers(
  { activeQuestion, selectedAnswer, confirmedAnswer, answerReset, refreshQuestion }: QuizAnswerOptions,
  userNickname: Ref<string>,
  retractions: ReadonlyMap<string, Promise<void>> = new Map(),
) {
  const answerError = ref('')
  const answerPending = ref(false)
  const queues = new Map<string, AnswerQueue>()
  const { getErrorCode, getErrorMessage } = useApiError()
  let disposed = false

  function invalidate(questionId?: string) {
    for (const [
      id,
      queue,
    ] of queues) {
      if (!questionId || id === questionId) {
        queue.version++
        queue.pending = null
      }
    }
    if (!questionId || activeQuestion.value?.id === questionId) {
      answerError.value = ''
      answerPending.value = false
    }
  }

  watch(answerReset, reset => reset && invalidate(reset.questionId), { flush: 'sync' })
  watch(() => activeQuestion.value?.id, (_id, previousId) => {
    if (previousId) {
      const previous = queues.get(previousId)
      if (previous) previous.pending = null
    }
    answerError.value = ''
    answerPending.value = false
  }, { flush: 'sync' })
  onScopeDispose(() => {
    disposed = true
    invalidate()
  }, true)

  /** Waits only for the current HTTP write, never for work blocked by a retraction. */
  async function waitForInFlightSubmission(questionId: string): Promise<void> {
    try {
      await queues.get(questionId)?.inFlight
    }
    catch {
      // Submission errors belong to drain; a failed write must still allow retraction.
    }
  }

  /** Drains only the latest queued selection; each request owns an immutable snapshot. */
  async function drain(queue: AnswerQueue) {
    while (queue.pending && !disposed) {
      const retraction = retractions.get(queue.pending.question_id)
      if (retraction) {
        await retraction
        continue
      }
      const submission = queue.pending
      queue.pending = null
      const { question_id, index, ...answer } = submission
      const version = queue.version
      if (activeQuestion.value?.id !== question_id || activeQuestion.value.is_locked) {
        if (activeQuestion.value?.id === question_id) {
          answerPending.value = false
          answerError.value = getErrorMessage({ data: { code: 'quiz.question_locked' } })
        }
        break
      }

      try {
        queue.inFlight = $fetch('/api/answers/submit', {
          method: 'POST',
          body: { question_id, ...answer },
        })
        await queue.inFlight
        if (disposed || queue.version !== version) continue
        sessionStorage.setItem(`answer-${question_id}`, index.toString())
        if (activeQuestion.value?.id === question_id) confirmedAnswer.value = index
      }
      catch (error: unknown) {
        if (disposed || queue.version !== version || activeQuestion.value?.id !== question_id) continue
        if (!queue.pending && selectedAnswer.value === index) {
          answerError.value = getErrorMessage(error)
        }
        const code = getErrorCode(error)
        if (code === 'quiz.question_locked' || code === 'quiz.question_changed' || code === 'quiz.no_active_question') {
          try {
            await refreshQuestion()
          }
          catch {
            // Keep the submission error and draft if the authoritative refresh also fails.
          }
        }
      }
      finally {
        queue.inFlight = null
        if (!disposed && queue.version === version && activeQuestion.value?.id === question_id && !queue.pending) {
          answerPending.value = false
        }
      }
    }
  }

  function submitAnswer(): Promise<void> {
    const question = activeQuestion.value
    const index = selectedAnswer.value
    if (disposed || index === null || !question || question.is_locked) return Promise.resolve()

    const userId = localStorage.getItem('quiz-user-id')
    const text = question.answer_options[index]?.text
    if (!userId || !text || !userNickname.value) {
      answerError.value = getErrorMessage(undefined)
      return Promise.resolve()
    }

    let queue = queues.get(question.id)
    if (!queue) {
      queue = { version: 0, pending: null, running: null, inFlight: null }
      queues.set(question.id, queue)
    }
    queue.pending = {
      question_id: question.id,
      selected_answer: { ...text },
      user_id: userId,
      user_nickname: userNickname.value,
      index,
    }
    answerError.value = ''
    answerPending.value = true
    const currentQueue = queue
    currentQueue.running ??= drain(currentQueue).finally(() => {
      currentQueue.running = null
      if (!currentQueue.pending) queues.delete(question.id)
    })
    return currentQueue.running
  }

  return { answerError, answerPending, invalidateAnswers: invalidate, submitAnswer, waitForInFlightSubmission }
}
