import type { PresenterCurrentState, Question } from '~/types'

export type PresenterQuizPhase = 'open' | 'reveal'

export type PresenterQuizStep = {
  kind: 'question'
  phase: PresenterQuizPhase
  questionIndex: number
} | {
  kind: 'leaderboard'
}

export type PresenterQuizTransition = PresenterQuizStep | {
  direction: 'next' | 'previous'
  kind: 'boundary'
}

/** Resolves the visible presenter step from persisted quiz state. */
export function getInitialPresenterQuizStep(
  questions: Question[],
  currentState: PresenterCurrentState,
): PresenterQuizStep | null {
  if (questions.length === 0) return null

  const activeKey = currentState.currentQuestion?.key
  const activeIndex = activeKey
    ? questions.findIndex(question => question.key === activeKey)
    : -1

  return {
    kind: 'question',
    phase: activeIndex >= 0 && currentState.currentQuestion?.is_locked ? 'reveal' : 'open',
    questionIndex: activeIndex >= 0 ? activeIndex : 0,
  }
}

/** Returns the next visible step or the next-slide boundary signal. */
export function getNextPresenterQuizStep(
  step: PresenterQuizStep,
  totalQuestions: number,
): PresenterQuizTransition {
  if (step.kind === 'leaderboard') return { direction: 'next', kind: 'boundary' }
  if (step.phase === 'open') return { ...step, phase: 'reveal' }
  if (step.questionIndex + 1 < totalQuestions) {
    return { kind: 'question', phase: 'open', questionIndex: step.questionIndex + 1 }
  }
  return { kind: 'leaderboard' }
}

/** Returns the previous visible step or the previous-slide boundary signal. */
export function getPreviousPresenterQuizStep(
  step: PresenterQuizStep,
  totalQuestions: number,
): PresenterQuizTransition {
  if (step.kind === 'leaderboard') {
    return totalQuestions > 0
      ? { kind: 'question', phase: 'reveal', questionIndex: totalQuestions - 1 }
      : { direction: 'previous', kind: 'boundary' }
  }
  if (step.phase === 'reveal') return { ...step, phase: 'open' }
  if (step.questionIndex > 0) {
    return { kind: 'question', phase: 'reveal', questionIndex: step.questionIndex - 1 }
  }
  return { direction: 'previous', kind: 'boundary' }
}
