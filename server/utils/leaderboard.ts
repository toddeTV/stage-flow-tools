import type {
  Answer,
  Question,
} from '~/types'

export interface LeaderboardEntry {
  rank: number
  userId: string
  nickname: string
  correctAnswers: number
}

export interface LeaderboardResults {
  leaderboard: LeaderboardEntry[]
  totalPublishedQuestions: number
  totalQuestionsWithCorrectAnswers: number
}

/** Builds ranked scores from answers to published questions with a correct option. */
export function buildLeaderboardResults(questionList: Question[], answerList: Answer[]): LeaderboardResults {
  const publishedQuestions = questionList.filter(question => question.alreadyPublished)
  const correctAnswersByQuestion = new Map<string, Set<string>>()

  for (const question of publishedQuestions) {
    const correctTexts = new Set<string>()
    for (const option of question.answer_options) {
      if (option.emoji === '⭐') {
        correctTexts.add(option.text.en.toLowerCase())
      }
    }
    if (correctTexts.size > 0) {
      correctAnswersByQuestion.set(question.id, correctTexts)
    }
  }

  const userScores = new Map<string, Omit<LeaderboardEntry, 'rank' | 'userId'>>()

  for (const answer of answerList) {
    const correctTexts = correctAnswersByQuestion.get(answer.question_id)
    if (!correctTexts) continue

    const existing = userScores.get(answer.user_id)
    if (existing) {
      if (correctTexts.has(answer.selected_answer.en.toLowerCase())) {
        existing.correctAnswers++
      }
      continue
    }

    userScores.set(answer.user_id, {
      nickname: answer.user_nickname,
      correctAnswers: correctTexts.has(answer.selected_answer.en.toLowerCase()) ? 1 : 0,
    })
  }

  const sorted = [
    ...userScores.entries(),
  ]
    .sort((a, b) => b[1].correctAnswers - a[1].correctAnswers)

  const leaderboard: LeaderboardEntry[] = []
  let currentRank = 0
  let previousScore = -1

  for (const [
    userId,
    data,
  ] of sorted) {
    if (data.correctAnswers !== previousScore) {
      currentRank += 1
      previousScore = data.correctAnswers
    }
    leaderboard.push({
      rank: currentRank,
      userId,
      ...data,
    })
  }

  return {
    leaderboard,
    totalPublishedQuestions: publishedQuestions.length,
    totalQuestionsWithCorrectAnswers: correctAnswersByQuestion.size,
  }
}
