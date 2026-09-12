import { describe, expect, it } from 'vite-plus/test'
import type { PresenterCurrentState, Question } from '~/types'
import {
  getInitialPresenterQuizStep,
  getNextPresenterQuizStep,
  getPreviousPresenterQuizStep,
} from './presenter-quiz-state'

function question(key: string): Question {
  return {
    alreadyPublished: false,
    answer_options: [],
    createdAt: '',
    id: key,
    is_disabled: false,
    is_locked: false,
    key,
    question_text: { en: key },
    sortOrder: 0,
  }
}

function currentState(key?: string, isLocked = false): PresenterCurrentState {
  return {
    currentQuestion: key
      ? {
        answer_options: [],
        createdAt: '',
        id: key,
        index: 1,
        is_active: true,
        is_locked: isLocked,
        key,
        question_text: { en: key },
        totalQuestions: 2,
      }
      : null,
    hasActiveQuestion: Boolean(key),
    receivedAnswers: 0,
    receivedAnswersPercent: 0,
    totalUsers: 0,
  }
}

describe('presenter quiz state', () => {
  it('starts at question one open and resumes an active question phase', () => {
    const questions = [
      question('one'),
      question('two'),
    ]
    expect(getInitialPresenterQuizStep(questions, currentState())).toEqual({
      kind: 'question', phase: 'open', questionIndex: 0,
    })
    expect(getInitialPresenterQuizStep(questions, currentState('two', true))).toEqual({
      kind: 'question', phase: 'reveal', questionIndex: 1,
    })
    expect(getInitialPresenterQuizStep(questions, currentState('missing'))).toEqual({
      kind: 'question', phase: 'open', questionIndex: 0,
    })
    expect(getInitialPresenterQuizStep([], currentState())).toBeNull()
  })

  it('walks the full forward and backward sequence', () => {
    const q1Open = { kind: 'question', phase: 'open', questionIndex: 0 } as const
    const q1Reveal = getNextPresenterQuizStep(q1Open, 2)
    const q2Open = getNextPresenterQuizStep(q1Reveal as never, 2)
    const q2Reveal = getNextPresenterQuizStep(q2Open as never, 2)
    const leaderboard = getNextPresenterQuizStep(q2Reveal as never, 2)
    const recap = getNextPresenterQuizStep(leaderboard as never, 2)

    expect([
      q1Reveal,
      q2Open,
      q2Reveal,
      leaderboard,
      recap,
    ]).toEqual([
      { kind: 'question', phase: 'reveal', questionIndex: 0 },
      { kind: 'question', phase: 'open', questionIndex: 1 },
      { kind: 'question', phase: 'reveal', questionIndex: 1 },
      { kind: 'leaderboard' },
      { kind: 'recap' },
    ])
    expect(getNextPresenterQuizStep(recap as never, 2)).toEqual({ direction: 'next', kind: 'boundary' })
    expect(getPreviousPresenterQuizStep(recap as never, 2)).toEqual(leaderboard)
    expect(getPreviousPresenterQuizStep(leaderboard as never, 2)).toEqual(q2Reveal)
    expect(getPreviousPresenterQuizStep(q2Reveal as never, 2)).toEqual(q2Open)
    expect(getPreviousPresenterQuizStep(q2Open as never, 2)).toEqual(q1Reveal)
    expect(getPreviousPresenterQuizStep(q1Reveal as never, 2)).toEqual(q1Open)
    expect(getPreviousPresenterQuizStep(q1Open, 2)).toEqual({ direction: 'previous', kind: 'boundary' })
  })

  it('handles one question and an empty leaderboard boundary', () => {
    const open = { kind: 'question', phase: 'open', questionIndex: 0 } as const
    const reveal = getNextPresenterQuizStep(open, 1)
    expect(getNextPresenterQuizStep(reveal as never, 1)).toEqual({ kind: 'leaderboard' })
    expect(getNextPresenterQuizStep({ kind: 'leaderboard' }, 1)).toEqual({ kind: 'recap' })
    expect(getPreviousPresenterQuizStep({ kind: 'leaderboard' }, 0)).toEqual({
      direction: 'previous', kind: 'boundary',
    })
  })
})
