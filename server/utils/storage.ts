import { promises as fs } from 'fs'
import { join } from 'path'
import { createId } from '@paralleldrive/cuid2'
import { lock } from 'proper-lockfile'
import type { H3Event } from 'h3'
import type { Question, Results, Answer } from '~/types'

const DATA_DIR = join(process.cwd(), 'data')
const QUESTIONS_FILE = join(DATA_DIR, 'questions.json')
const ANSWERS_FILE = join(DATA_DIR, 'answers.json')
const ADMIN_FILE = join(DATA_DIR, 'admin.json')

// Initialize storage with runtime config
async function initStorage(event?: H3Event) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })

    // Initialize questions file
    try {
      await fs.access(QUESTIONS_FILE)
    }
    catch (error: unknown) {
      await fs.writeFile(QUESTIONS_FILE, JSON.stringify([]))
    }

    // Initialize answers file
    try {
      await fs.access(ANSWERS_FILE)
    }
    catch (error: unknown) {
      await fs.writeFile(ANSWERS_FILE, JSON.stringify([]))
    }

    // Initialize admin file with defaults from runtime config
    try {
      await fs.access(ADMIN_FILE)
    }
    catch (error: unknown) {
      // Get runtime config if event is provided, otherwise use defaults
      const config = event
        ? useRuntimeConfig(event)
        : {
            adminUsername: 'admin',
            adminPassword: '123'
          }
      const defaultAdmin = {
        username: config.adminUsername,
        password: config.adminPassword
      }
      await fs.writeFile(ADMIN_FILE, JSON.stringify(defaultAdmin))
    }
  }
  catch (error: unknown) {
    console.error('Storage initialization error:', error)
  }
}

// Question operations
export async function getQuestions(): Promise<Question[]> {
  await initStorage()
  const release = await lock(QUESTIONS_FILE)
  try {
    const data = await fs.readFile(QUESTIONS_FILE, 'utf-8')
    return JSON.parse(data)
  }
  finally {
    await release()
  }
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  await initStorage()
  const release = await lock(QUESTIONS_FILE)
  try {
    await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2))
  }
  finally {
    await release()
  }
}

export async function getActiveQuestion(): Promise<Question | undefined> {
  const questions = await getQuestions()
  return questions.find(q => (q as any).is_active)
}

export async function createQuestion(questionData: Omit<Question, 'id' | 'is_locked'>): Promise<Question> {
  const questions = await getQuestions()
  const newQuestion: Question = {
    id: createId(),
    ...questionData,
    is_locked: false
  }
  questions.push(newQuestion)
  await saveQuestions(questions)
  return newQuestion
}

export async function publishQuestion(questionId: string): Promise<Question | undefined> {
  const questions = await getQuestions()

  // Deactivate all questions
  questions.forEach((q) => {
    ;(q as any).is_active = false
  })

  // Activate the new question
  const question = questions.find(q => q.id === questionId)
  if (question) {
    ;(question as any).is_active = true
    await saveQuestions(questions)

    // Clear all answers when publishing new question
    await saveAnswers([])
  }

  return question
}

export async function toggleQuestionLock(questionId: string): Promise<Question | undefined> {
  const questions = await getQuestions()
  const question = questions.find(q => q.id === questionId)

  if (question) {
    question.is_locked = !question.is_locked
    await saveQuestions(questions)
  }

  return question
}

// Answer operations
export async function getAnswers(): Promise<Answer[]> {
  await initStorage()
  const release = await lock(ANSWERS_FILE)
  try {
    const data = await fs.readFile(ANSWERS_FILE, 'utf-8')
    return JSON.parse(data)
  }
  finally {
    await release()
  }
}

export async function saveAnswers(answers: Answer[]): Promise<void> {
  await initStorage()
  const release = await lock(ANSWERS_FILE)
  try {
    await fs.writeFile(ANSWERS_FILE, JSON.stringify(answers, null, 2))
  }
  finally {
    await release()
  }
}

export async function submitAnswer(answerData: Omit<Answer, 'id' | 'timestamp'>): Promise<Answer[]> {
  const questions = await getQuestions()
  const question = questions.find(q => q.id === answerData.question_id)

  if (!question) {
    throw new Error('Question not found')
  }

  if (!question.answer_options.includes(answerData.selected_answer)) {
    throw new Error('Invalid answer option')
  }

  const answers = await getAnswers()

  // Check if user already answered this question
  const existingIndex = answers.findIndex(
    a => a.question_id === answerData.question_id
      && a.user_nickname === answerData.user_nickname
  )

  if (existingIndex >= 0) {
    // Update existing answer
    const existingAnswer = answers[existingIndex]
    if (existingAnswer) {
      answers[existingIndex] = {
        ...existingAnswer,
        selected_answer: answerData.selected_answer,
        timestamp: new Date().toISOString()
      }
    }
  }
  else {
    // Add new answer
    const newAnswer: Answer = {
      id: createId(),
      ...answerData,
      timestamp: new Date().toISOString()
    }
    answers.push(newAnswer)
  }

  await saveAnswers(answers)
  return answers
}

export async function getAnswersForQuestion(questionId: string): Promise<Answer[]> {
  const answers = await getAnswers()
  return answers.filter(a => a.question_id === questionId)
}

// Admin operations
export async function validateAdmin(username: string, password: string, event?: H3Event): Promise<boolean> {
  await initStorage(event)
  const data = await fs.readFile(ADMIN_FILE, 'utf-8')
  const admin = JSON.parse(data)

  return admin.username === username && admin.password === password
}

// Get results for current question
export async function getCurrentResults(): Promise<Results | null> {
  const activeQuestion = await getActiveQuestion()
  if (!activeQuestion) return null

  const answers = await getAnswersForQuestion(activeQuestion.id)

  // Count votes for each option
  const results: Record<string, number> = {}
  activeQuestion.answer_options.forEach((option) => {
    results[option] = 0
  })

  answers.forEach((answer) => {
    if (Object.prototype.hasOwnProperty.call(results, answer.selected_answer)) {
      const currentCount = results[answer.selected_answer]
      if (typeof currentCount === 'number') {
        results[answer.selected_answer] = currentCount + 1
      }
    }
  })

  return {
    question: activeQuestion,
    results,
    totalVotes: answers.length
  }
}