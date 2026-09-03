import { buildLeaderboardResults } from '../../utils/leaderboard'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const questions = await getQuestions()
  const answers = await getAnswers()

  return buildLeaderboardResults(questions, answers)
})
