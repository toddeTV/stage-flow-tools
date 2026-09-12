import { buildQuizRecap } from '../../utils/quiz-recap'

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const questions = await getQuestions()
  const answers = await getAnswers()

  return buildQuizRecap(questions, answers)
})
