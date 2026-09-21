import { WebSocketChannel } from '~/types'
import type { Results } from '~/types'
import { buildQuestionOptionResults } from '../../utils/quiz-results'
import { getPeerCount } from '../../utils/websocket'
import { getAnswersForQuestion } from './answers'
import { initStorage } from './core'
import {
  getActiveQuestion,
  getQuestionById,
} from './questions'

export async function getResultsForQuestion(
  questionId: string,
): Promise<Results | null> {
  await initStorage()
  const question = getQuestionById(questionId)

  if (!question) {
    return null
  }

  const answerList = await getAnswersForQuestion(question.id)

  return {
    question,
    results: buildQuestionOptionResults(question, answerList),
    totalVotes: answerList.length,
    totalConnections: getPeerCount(WebSocketChannel.DEFAULT),
  }
}

export async function getCurrentResults(): Promise<Results | null> {
  const activeQuestion = await getActiveQuestion()

  return activeQuestion ? getResultsForQuestion(activeQuestion.id) : null
}
