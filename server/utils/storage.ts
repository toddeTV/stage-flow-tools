import { promises as fs } from 'fs'
import { join } from 'path'
import { createId } from '@paralleldrive/cuid2'
import { lock } from 'proper-lockfile'
import type { H3Event } from 'h3'
import type { Question, Results, Answer, InputQuestion } from '~/types'

const DATA_DIR = join(process.cwd(), 'data')
const QUESTIONS_FILE = join(DATA_DIR, 'questions.json')
const ANSWERS_FILE = join(DATA_DIR, 'answers.json')
const ADMIN_FILE = join(DATA_DIR, 'admin.json')
const PREDEFINED_QUESTIONS_FILE = join(DATA_DIR, 'predefined-questions.json')
// Type guard to check for Node.js errors
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

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

    // Process predefined questions
    try {
      const predefinedData = await fs.readFile(PREDEFINED_QUESTIONS_FILE, 'utf-8')
      const predefinedQuestions: InputQuestion[] = JSON.parse(predefinedData)

      if (predefinedQuestions.length > 0) {
        const existingQuestions = await getQuestions()
        const newQuestions: Question[] = predefinedQuestions.map(q => ({
          ...q,
          id: createId(),
          is_locked: false
        }))

        await saveQuestions([...existingQuestions, ...newQuestions])
        await fs.unlink(PREDEFINED_QUESTIONS_FILE)
        logger('Predefined questions loaded and file removed.')
      }
    }
    catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        // File not found, which is a normal case, so we do nothing.
      }
      else {
        // For any other errors, log them to the console.
        logger_error('Error processing predefined questions file:', error)
      }
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
    logger_error('Storage initialization error:', error)
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
  await initStorage()
  const release = await lock(QUESTIONS_FILE)
  try {
    const data = await fs.readFile(QUESTIONS_FILE, 'utf-8')
    const questions: Question[] = JSON.parse(data)
    const newQuestion: Question = {
      id: createId(),
      ...questionData,
      is_locked: false
    }
    questions.push(newQuestion)
    await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2))
    return newQuestion
  }
  finally {
    await release()
  }
}

export async function publishQuestion(questionId: string): Promise<Question | undefined> {
  await initStorage()
  const releaseQuestions = await lock(QUESTIONS_FILE)
  const releaseAnswers = await lock(ANSWERS_FILE)
  try {
    const data = await fs.readFile(QUESTIONS_FILE, 'utf-8')
    const questions: Question[] = JSON.parse(data)

    // Deactivate all questions
    questions.forEach((q) => {
      ;(q as any).is_active = false
    })

    // Activate the new question
    const question = questions.find(q => q.id === questionId)
    if (question) {
      ;(question as any).is_active = true
      await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2))

      // Clear all answers when publishing new question
      await fs.writeFile(ANSWERS_FILE, JSON.stringify([]))
    }
    return question
  }
  finally {
    await releaseAnswers()
    await releaseQuestions()
  }
}

export async function toggleQuestionLock(questionId: string): Promise<Question | undefined> {
  await initStorage()
  const release = await lock(QUESTIONS_FILE)
  try {
    const data = await fs.readFile(QUESTIONS_FILE, 'utf-8')
    const questions: Question[] = JSON.parse(data)
    const question = questions.find(q => q.id === questionId)

    if (question) {
      question.is_locked = !question.is_locked
      await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2))
    }

    return question
  }
  finally {
    await release()
  }
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
  await initStorage()
  const release = await lock(ANSWERS_FILE)
  try {
    const questions = await getQuestions()
    const question = questions.find(q => q.id === answerData.question_id)

    if (!question) {
      throw new Error('Question not found')
    }

    if (!question.answer_options.includes(answerData.selected_answer)) {
      throw new Error('Invalid answer option')
    }

    const data = await fs.readFile(ANSWERS_FILE, 'utf-8')
    const answers: Answer[] = JSON.parse(data)

    // Check if user already answered this question
    const existingIndex = answers.findIndex(
      a => a.question_id === answerData.question_id
        && a.user_id === answerData.user_id
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

    await fs.writeFile(ANSWERS_FILE, JSON.stringify(answers, null, 2))
    return answers
  }
  finally {
    await release()
  }
}

export async function getAnswersForQuestion(questionId: string): Promise<Answer[]> {
  const answers = await getAnswers()
  return answers.filter(a => a.question_id === questionId)
}

export async function retractAnswer(userId: string, questionId: string): Promise<Answer[]> {
  await initStorage()
  const release = await lock(ANSWERS_FILE)
  try {
    const data = await fs.readFile(ANSWERS_FILE, 'utf-8')
    const answers: Answer[] = JSON.parse(data)

    const updatedAnswers = answers.filter(
      a => !(a.user_id === userId && a.question_id === questionId)
    )

    await fs.writeFile(ANSWERS_FILE, JSON.stringify(updatedAnswers, null, 2))
    return updatedAnswers
  }
  finally {
    await release()
  }
}

// Admin operations
export async function validateAdmin(username: string, password: string, event?: H3Event): Promise<boolean> {
  await initStorage(event)
  const data = await fs.readFile(ADMIN_FILE, 'utf-8')
  const admin = JSON.parse(data)

  return admin.username === username && admin.password === password
}

// Get results for current question
export async function getResultsForQuestion(questionId: string): Promise<Results | null> {
  const questions = await getQuestions()
  const question = questions.find(q => q.id === questionId)
  if (!question) return null

  const answers = await getAnswersForQuestion(question.id)

  // Count votes for each option
  const results: Record<string, number> = {}
  question.answer_options.forEach((option) => {
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
    question,
    results,
    totalVotes: answers.length
  }
}

export async function getCurrentResults(): Promise<Results | null> {
  const activeQuestion = await getActiveQuestion()
  if (!activeQuestion) return null
  return getResultsForQuestion(activeQuestion.id)
}