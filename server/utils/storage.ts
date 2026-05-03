import {
  and,
  asc,
  desc,
  eq,
  or,
} from 'drizzle-orm'
import type { H3Event } from 'h3'
import type {
  Answer,
  InputQuestion,
  Question,
  Results,
} from '~/types'
import {
  createQuestionInsert,
  createStoredAnswerInsert,
  createStoredQuestionInsert,
  deserializeAnswer,
  deserializeQuestion,
} from '../database/question-records'
import {
  applyLocalMigrations,
  getLocalDatabaseClient,
} from '../database/local-sqlite'
import {
  answers,
  questions,
} from '../database/schema'
import { getPeers } from './websocket'

let storageInitialized = false

function getDatabase() {
  return getLocalDatabaseClient().db
}

function getQuestionById(questionId: string): Question | undefined {
  const row = getDatabase()
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .get()

  return row ? deserializeQuestion(row) : undefined
}

/** Initializes SQLite access and applies any pending migrations once. */
export async function initStorage(_event?: H3Event) {
  if (storageInitialized) return

  try {
    applyLocalMigrations(getDatabase())
    storageInitialized = true
  }
  catch (error: unknown) {
    logger_error('SQLite initialization error:', error)
    throw error
  }
}

// Question operations
export async function getQuestions(): Promise<Question[]> {
  await initStorage()

  return getDatabase()
    .select()
    .from(questions)
    .orderBy(asc(questions.createdAt))
    .all()
    .map(deserializeQuestion)
}

export async function saveQuestions(questionList: Question[]): Promise<void> {
  await initStorage()

  getDatabase().transaction((transaction) => {
    transaction.delete(answers).run()
    transaction.delete(questions).run()

    if (questionList.length > 0) {
      transaction.insert(questions).values(questionList.map(createStoredQuestionInsert)).run()
    }
  })
}

export async function getActiveQuestion(): Promise<Question | undefined> {
  await initStorage()

  const activeQuestion = getDatabase()
    .select()
    .from(questions)
    .where(eq(questions.isActive, true))
    .orderBy(desc(questions.createdAt))
    .get()

  return activeQuestion ? deserializeQuestion(activeQuestion) : undefined
}

export async function createQuestion(
  questionData: Omit<Question, 'id' | 'is_active' | 'is_locked' | 'createdAt' | 'alreadyPublished'>,
): Promise<Question> {
  await initStorage()

  const row = createQuestionInsert(questionData as InputQuestion)

  const existingQuestion = getDatabase()
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.key, row.key))
    .get()

  if (existingQuestion) {
    throw new Error(`A question with key "${row.key}" already exists`)
  }

  getDatabase().insert(questions).values(row).run()

  return deserializeQuestion(row)
}

export async function publishQuestion(questionIdentifier: string): Promise<Question | undefined> {
  await initStorage()

  const questionRow = getDatabase()
    .select()
    .from(questions)
    .where(or(eq(questions.key, questionIdentifier), eq(questions.id, questionIdentifier)))
    .get()

  if (!questionRow) {
    return undefined
  }

  getDatabase().transaction((transaction) => {
    transaction.update(questions).set({ isActive: false }).run()
    transaction.update(questions).set({
      alreadyPublished: true,
      isActive: true,
    }).where(eq(questions.id, questionRow.id)).run()
  })

  const publishedQuestion = await getActiveQuestion()

  if (publishedQuestion) {
    const results = await getResultsForQuestion(publishedQuestion.id)
    broadcast('results-update', results)
  }

  return publishedQuestion
}

/** Deactivate the active question (answers are preserved for potential re-publishing). */
export async function unpublishActiveQuestion(): Promise<Question | undefined> {
  await initStorage()

  const activeQuestion = await getActiveQuestion()

  if (activeQuestion) {
    getDatabase()
      .update(questions)
      .set({ isActive: false })
      .where(eq(questions.id, activeQuestion.id))
      .run()

    return {
      ...activeQuestion,
      is_active: false,
    }
  }

  return undefined
}

export async function toggleQuestionLock(questionId: string): Promise<Question | undefined> {
  await initStorage()

  const question = getQuestionById(questionId)

  if (question) {
    getDatabase()
      .update(questions)
      .set({ isLocked: !question.is_locked })
      .where(eq(questions.id, questionId))
      .run()

    return {
      ...question,
      is_locked: !question.is_locked,
    }
  }

  return undefined
}

// Answer operations
export async function getAnswers(): Promise<Answer[]> {
  await initStorage()

  return getDatabase()
    .select()
    .from(answers)
    .orderBy(asc(answers.timestamp))
    .all()
    .map(deserializeAnswer)
}

export async function saveAnswers(answerList: Answer[]): Promise<void> {
  await initStorage()

  getDatabase().transaction((transaction) => {
    transaction.delete(answers).run()

    if (answerList.length > 0) {
      transaction.insert(answers).values(answerList.map(createStoredAnswerInsert)).run()
    }
  })
}

export async function submitAnswer(answerData: Omit<Answer, 'id' | 'timestamp'>): Promise<Answer[]> {
  await initStorage()
  const question = getQuestionById(answerData.question_id)

  if (!question) {
    throw new Error('Question not found')
  }

  if (!question.answer_options.some(option => option.text.en === answerData.selected_answer.en)) {
    throw new Error('Invalid answer option')
  }

  const existingAnswer = getDatabase()
    .select()
    .from(answers)
    .where(and(
      eq(answers.questionId, answerData.question_id),
      eq(answers.userId, answerData.user_id),
    ))
    .get()

  if (existingAnswer) {
    getDatabase()
      .update(answers)
      .set({
        selectedAnswer: JSON.stringify(answerData.selected_answer),
        timestamp: new Date().toISOString(),
      })
      .where(eq(answers.id, existingAnswer.id))
      .run()
  }
  else {
    getDatabase().insert(answers).values(createStoredAnswerInsert({
      ...answerData,
      timestamp: new Date().toISOString(),
    })).run()
  }

  return getAnswers()
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

export async function retractAnswer(userId: string, questionId: string): Promise<Answer[]> {
  await initStorage()

  getDatabase()
    .delete(answers)
    .where(and(
      eq(answers.userId, userId),
      eq(answers.questionId, questionId),
    ))
    .run()

  return getAnswersForQuestion(questionId)
}

// Admin operations
export async function validateAdmin(username: string, password: string, event?: H3Event): Promise<boolean> {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()

  return config.adminUsername === username && config.adminPassword === password
}

// Get results for current question
export async function getResultsForQuestion(
  questionId: string,
  allQuestions?: Question[],
  allAnswers?: Answer[],
): Promise<Results | null> {
  const questionList = allQuestions || await getQuestions()
  const question = questionList.find(item => item.id === questionId)

  if (!question) {
    return null
  }

  const answerList = allAnswers || await getAnswersForQuestion(question.id)

  const results: Record<string, { count: number, emoji?: string }> = {}
  for (const option of question.answer_options) {
    results[option.text.en] = {
      count: 0,
      emoji: option.emoji,
    }
  }

  for (const answer of answerList) {
    const selectedAnswer = answer.selected_answer.en

    if (Object.prototype.hasOwnProperty.call(results, selectedAnswer)) {
      results[selectedAnswer]!.count += 1
    }
  }

  return {
    question,
    results,
    totalVotes: answerList.length,
    totalConnections: (await getPeers()).length,
  }
}

export async function getCurrentResults(): Promise<Results | null> {
  const activeQuestion = await getActiveQuestion()

  return activeQuestion ? getResultsForQuestion(activeQuestion.id) : null
}
