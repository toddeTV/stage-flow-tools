import type {
  PresenterCurrentState,
  PresenterQuestionsOverview,
  Question,
} from '~/types'

function getPercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function findActiveQuestion(questionList: Question[]): Question | undefined {
  for (let index = questionList.length - 1; index >= 0; index -= 1) {
    const question = questionList[index]

    if (question?.is_active) {
      return question
    }
  }

  return undefined
}

/** Returns stable high-level quiz metadata for presenter integrations. */
export async function getPresenterQuestionsOverview(): Promise<PresenterQuestionsOverview> {
  const questionList = await getQuestions()

  return {
    totalQuestions: questionList.length,
    questions: questionList.map(question => ({
      id: question.id,
      key: question.key,
      question_text: question.question_text,
    })),
  }
}

/** Returns polling-friendly presenter state for the active question. */
export async function getPresenterCurrentState(): Promise<PresenterCurrentState> {
  const [
    questionList,
    peers,
  ] = await Promise.all([
    getQuestions(),
    getPeers(),
  ])
  const totalUsers = peers.length
  const currentQuestion = findActiveQuestion(questionList)

  if (!currentQuestion) {
    return {
      hasActiveQuestion: false,
      totalUsers,
      receivedAnswers: 0,
      receivedAnswersPercent: 0,
      currentQuestion: null,
    }
  }

  const answerList = await getAnswersForQuestion(currentQuestion.id)
  const receivedAnswers = answerList.length
  const results = buildQuestionOptionResults(currentQuestion, answerList)
  const currentQuestionIndex = questionList.findIndex(question => question.id === currentQuestion.id) + 1

  return {
    hasActiveQuestion: true,
    totalUsers,
    receivedAnswers,
    receivedAnswersPercent: getPercent(receivedAnswers, totalUsers),
    currentQuestion: {
      id: currentQuestion.id,
      key: currentQuestion.key,
      index: currentQuestionIndex,
      totalQuestions: questionList.length,
      question_text: currentQuestion.question_text,
      note: currentQuestion.note,
      is_active: currentQuestion.is_active ?? false,
      is_locked: currentQuestion.is_locked,
      createdAt: currentQuestion.createdAt,
      answer_options: currentQuestion.answer_options.map(option => ({
        text: option.text,
        emoji: option.emoji,
        count: results[option.text.en]?.count ?? 0,
        percent: getPercent(results[option.text.en]?.count ?? 0, receivedAnswers),
      })),
    },
  }
}
