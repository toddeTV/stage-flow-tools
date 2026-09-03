import { describe, expect, it } from 'vite-plus/test'
import type {
  Answer,
  Question,
} from '~/types'
import { buildLeaderboardResults } from './leaderboard'

const publishedQuestion: Question = {
  id: 'published-question',
  key: 'published-question',
  question_text: { en: 'Which answer is correct?' },
  answer_options: [
    { emoji: '⭐', text: { en: 'Correct' } },
    { text: { en: 'Incorrect' } },
  ],
  is_locked: false,
  createdAt: '2026-09-03T00:00:00.000Z',
  alreadyPublished: true,
}

function answer(userId: string, nickname: string): Answer {
  return {
    id: `${userId}-answer`,
    question_id: publishedQuestion.id,
    user_id: userId,
    user_nickname: nickname,
    selected_answer: { en: 'Incorrect' },
    timestamp: '2026-09-03T00:00:00.000Z',
  }
}

describe('buildLeaderboardResults', () => {
  it('ranks all participants tied at zero after only incorrect answers', () => {
    expect(buildLeaderboardResults(
      [
        publishedQuestion,
      ],
      [
        answer('user-one', 'One'),
        answer('user-two', 'Two'),
      ],
    )).toEqual({
      leaderboard: [
        {
          rank: 1,
          userId: 'user-one',
          nickname: 'One',
          correctAnswers: 0,
        },
        {
          rank: 1,
          userId: 'user-two',
          nickname: 'Two',
          correctAnswers: 0,
        },
      ],
      totalPublishedQuestions: 1,
      totalQuestionsWithCorrectAnswers: 1,
    })
  })
})
