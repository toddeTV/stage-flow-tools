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

/** Expected submission failures that HTTP handlers can expose safely. */
export class AnswerSubmissionError extends Error {
  constructor(public readonly reason: 'question_changed' | 'question_locked' | 'invalid_answer') {
    super(reason)
    this.name = 'AnswerSubmissionError'
  }
}

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

  if (!question?.is_active) {
    throw new AnswerSubmissionError('question_changed')
  }

  if (question.is_locked) {
    throw new AnswerSubmissionError('question_locked')
  }

  if (!question.answer_options.some(option => option.text.en === answerData.selected_answer.en)) {
    throw new AnswerSubmissionError('invalid_answer')
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
