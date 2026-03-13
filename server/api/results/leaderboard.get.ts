export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const questions = await getQuestions()
  const answers = await getAnswers()

  // Only consider published questions
  const publishedQuestions = questions.filter(q => q.alreadyPublished)

  // Build a map of questionId -> set of correct answer texts (lowercase en)
  const correctAnswersByQuestion = new Map<string, Set<string>>()
  for (const question of publishedQuestions) {
    const correctTexts = new Set<string>()
    for (const option of question.answer_options) {
      if (option.emoji === '\u2B50') {
        correctTexts.add(option.text.en.toLowerCase())
      }
    }
    if (correctTexts.size > 0) {
      correctAnswersByQuestion.set(question.id, correctTexts)
    }
  }

  // Aggregate scores per user
  const userScores = new Map<string, { nickname: string, correctAnswers: number }>()

  for (const answer of answers) {
    const correctTexts = correctAnswersByQuestion.get(answer.question_id)
    if (!correctTexts) continue

    const isCorrect = correctTexts.has(answer.selected_answer.en.toLowerCase())
    if (!isCorrect) continue

    const existing = userScores.get(answer.user_id)
    if (existing) {
      existing.correctAnswers++
    }
    else {
      userScores.set(answer.user_id, {
        nickname: answer.user_nickname,
        correctAnswers: 1,
      })
    }
  }

  // Sort descending by correctAnswers
  const sorted = [...userScores.entries()]
    .sort((a, b) => b[1].correctAnswers - a[1].correctAnswers)

  // Apply dense ranking
  const leaderboard: Array<{
    rank: number
    userId: string
    nickname: string
    correctAnswers: number
  }> = []

  let currentRank = 0
  let previousScore = -1
  for (const [userId, data] of sorted) {
    if (data.correctAnswers !== previousScore) {
      currentRank += 1
      previousScore = data.correctAnswers
    }
    leaderboard.push({
      rank: currentRank,
      userId,
      nickname: data.nickname,
      correctAnswers: data.correctAnswers,
    })
  }

  return {
    leaderboard,
    totalQuestionsWithCorrectAnswers: correctAnswersByQuestion.size,
  }
})
