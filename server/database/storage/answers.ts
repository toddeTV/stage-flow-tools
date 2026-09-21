import {
  and,
  asc,
  eq,
} from 'drizzle-orm'
import type { Answer } from '~/types'
import {
  createStoredAnswerInsert,
  deserializeAnswer,
} from '../question-records'
import { answers } from '../schema'
import {
  getDatabase,
  initStorage,
} from './core'
import { getQuestionById } from './questions'

export async function getAnswers(): Promise<Answer[]> {
  await initStorage()

  return getDatabase()
    .select()
    .from(answers)
    .orderBy(asc(answers.timestamp))
    .all()
    .map(deserializeAnswer)
}

export async function submitAnswer(answerData: Omit<Answer, 'id' | 'timestamp'>): Promise<void> {
  await initStorage()
  const question = getQuestionById(answerData.question_id)

  if (!question) {
    throw new Error('Question not found')
  }

  if (!question.is_active) {
    throw new Error('Question is not active')
  }

  if (question.is_locked) {
    throw new Error('Question is locked')
  }

  if (!question.answer_options.some(option => option.text.en === answerData.selected_answer.en)) {
    throw new Error('Invalid answer option')
  }

  const timestamp = new Date().toISOString()

  getDatabase()
    .insert(answers)
    .values(createStoredAnswerInsert({
      ...answerData,
      timestamp,
    }))
    .onConflictDoUpdate({
      target: [
        answers.questionId,
        answers.userId,
      ],
      set: {
        selectedAnswer: JSON.stringify(answerData.selected_answer),
        timestamp,
      },
    })
    .run()
}

export async function getAnswersForQuestion(questionId: string): Promise<Answer[]> {
  await initStorage()

  return getDatabase()
    .select()
    .from(answers)
    .where(eq(answers.questionId, questionId))
    .orderBy(asc(answers.timestamp))
    .all()
    .map(deserializeAnswer)
}

export async function retractAnswer(userId: string, questionId: string): Promise<void> {
  await initStorage()

  getDatabase()
    .delete(answers)
    .where(and(
      eq(answers.userId, userId),
      eq(answers.questionId, questionId),
    ))
    .run()
}

/** Deletes all stored answers for one question. */
export async function clearAnswersForQuestion(questionId: string): Promise<void> {
  await initStorage()

  getDatabase()
    .delete(answers)
    .where(eq(answers.questionId, questionId))
    .run()
}
