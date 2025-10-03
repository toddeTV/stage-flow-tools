import { promises as fs } from 'fs'
import { join } from 'path'
import type { H3Event } from 'h3'

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
    } catch {
      await fs.writeFile(QUESTIONS_FILE, JSON.stringify([]))
    }
    
    // Initialize answers file
    try {
      await fs.access(ANSWERS_FILE)
    } catch {
      await fs.writeFile(ANSWERS_FILE, JSON.stringify([]))
    }
    
    // Initialize admin file with defaults from runtime config
    try {
      await fs.access(ADMIN_FILE)
    } catch {
      // Get runtime config if event is provided, otherwise use defaults
      const config = event ? useRuntimeConfig(event) : {
        adminUsername: 'admin',
        adminPassword: '123'
      }
      const defaultAdmin = {
        username: config.adminUsername,
        password: config.adminPassword
      }
      await fs.writeFile(ADMIN_FILE, JSON.stringify(defaultAdmin))
    }
  } catch (error) {
    console.error('Storage initialization error:', error)
  }
}

// Question operations
export async function getQuestions() {
  await initStorage()
  const data = await fs.readFile(QUESTIONS_FILE, 'utf-8')
  return JSON.parse(data)
}

export async function saveQuestions(questions: any[]) {
  await initStorage()
  await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2))
}

export async function getActiveQuestion() {
  const questions = await getQuestions()
  return questions.find((q: any) => q.is_active)
}

export async function createQuestion(questionData: any) {
  const questions = await getQuestions()
  const newQuestion = {
    id: Date.now().toString(),
    ...questionData,
    created_at: new Date().toISOString()
  }
  questions.push(newQuestion)
  await saveQuestions(questions)
  return newQuestion
}

export async function publishQuestion(questionId: string) {
  const questions = await getQuestions()
  
  // Deactivate all questions
  questions.forEach((q: any) => {
    q.is_active = false
  })
  
  // Activate the new question
  const question = questions.find((q: any) => q.id === questionId)
  if (question) {
    question.is_active = true
    await saveQuestions(questions)
    
    // Clear all answers when publishing new question
    await saveAnswers([])
  }
  
  return question
}

export async function toggleQuestionLock(questionId: string) {
  const questions = await getQuestions()
  const question = questions.find((q: any) => q.id === questionId)
  
  if (question) {
    question.is_locked = !question.is_locked
    await saveQuestions(questions)
  }
  
  return question
}

// Answer operations
export async function getAnswers() {
  await initStorage()
  const data = await fs.readFile(ANSWERS_FILE, 'utf-8')
  return JSON.parse(data)
}

export async function saveAnswers(answers: any[]) {
  await initStorage()
  await fs.writeFile(ANSWERS_FILE, JSON.stringify(answers, null, 2))
}

export async function submitAnswer(answerData: any) {
  const answers = await getAnswers()
  
  // Check if user already answered this question
  const existingIndex = answers.findIndex(
    (a: any) => a.question_id === answerData.question_id && 
                a.user_nickname === answerData.user_nickname
  )
  
  if (existingIndex >= 0) {
    // Update existing answer
    answers[existingIndex] = {
      ...answers[existingIndex],
      selected_answer: answerData.selected_answer,
      timestamp: new Date().toISOString()
    }
  } else {
    // Add new answer
    const newAnswer = {
      id: Date.now().toString(),
      ...answerData,
      timestamp: new Date().toISOString()
    }
    answers.push(newAnswer)
  }
  
  await saveAnswers(answers)
  return answers
}

export async function getAnswersForQuestion(questionId: string) {
  const answers = await getAnswers()
  return answers.filter((a: any) => a.question_id === questionId)
}

// Admin operations
export async function validateAdmin(username: string, password: string, event?: H3Event) {
  await initStorage(event)
  const data = await fs.readFile(ADMIN_FILE, 'utf-8')
  const admin = JSON.parse(data)
  
  return admin.username === username && admin.password === password
}

// Get results for current question
export async function getCurrentResults() {
  const activeQuestion = await getActiveQuestion()
  if (!activeQuestion) return null
  
  const answers = await getAnswersForQuestion(activeQuestion.id)
  
  // Count votes for each option
  const results: { [key: string]: number } = {}
  activeQuestion.answer_options.forEach((option: string) => {
    results[option] = 0
  })
  
  answers.forEach((answer: any) => {
    if (results.hasOwnProperty(answer.selected_answer)) {
      results[answer.selected_answer]++
    }
  })
  
  return {
    question: activeQuestion,
    results,
    totalVotes: answers.length
  }
}