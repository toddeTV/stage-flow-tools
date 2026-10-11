import type { PresenterCurrentState, Question } from '~/types'

export interface PresenterQuizFlow {
  mode?: 'quiz' | 'status'
  showLeaderboard?: boolean
  showRecap?: boolean
}

export type PresenterQuizPhase = 'open' | 'reveal'

export type PresenterQuizStep = {
  kind: 'question'
  phase: PresenterQuizPhase
  questionIndex: number
} | {
  kind: 'leaderboard'
} | {
  kind: 'recap'
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
  flow: PresenterQuizFlow = {},
): PresenterQuizTransition {
  if (step.kind === 'recap') return { direction: 'next', kind: 'boundary' }
  if (step.kind === 'leaderboard') {
    return flow.showRecap !== false ? { kind: 'recap' } : { direction: 'next', kind: 'boundary' }
  }
  if (step.phase === 'open' && flow.mode !== 'status') return { ...step, phase: 'reveal' }
  if (step.questionIndex + 1 < totalQuestions) {
    return { kind: 'question', phase: 'open', questionIndex: step.questionIndex + 1 }
  }
  if (flow.showLeaderboard !== false) return { kind: 'leaderboard' }
  return flow.showRecap !== false ? { kind: 'recap' } : { direction: 'next', kind: 'boundary' }
}

/** Returns the previous visible step or the previous-slide boundary signal. */
export function getPreviousPresenterQuizStep(
  step: PresenterQuizStep,
  totalQuestions: number,
  flow: PresenterQuizFlow = {},
): PresenterQuizTransition {
  if (step.kind === 'recap' && flow.showLeaderboard !== false) return { kind: 'leaderboard' }
  if (step.kind === 'leaderboard' || step.kind === 'recap') {
    return totalQuestions > 0
      ? {
        kind: 'question', phase: flow.mode === 'status' ? 'open' : 'reveal', questionIndex: totalQuestions - 1,
      }
      : { direction: 'previous', kind: 'boundary' }
  }
  if (step.phase === 'reveal') return { ...step, phase: 'open' }
  if (step.questionIndex > 0) {
    return {
      kind: 'question', phase: flow.mode === 'status' ? 'open' : 'reveal', questionIndex: step.questionIndex - 1,
    }
  }
  return { direction: 'previous', kind: 'boundary' }
}
