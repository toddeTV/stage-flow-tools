import { createId } from '@paralleldrive/cuid2'
import type { H3Event } from 'h3'
import type { Question, Results, Answer, InputQuestion } from '~/types'

const storage = useStorage('data')

/** Safely read a storage item as an array. Handles raw strings and corrupted JSON from the fs driver. */
async function getArrayItem<T>(key: string, strict = false): Promise<T[]> {
  let value: unknown = await storage.getItem<T[]>(key)
  // The fs driver may return a raw string when the file contains invalid JSON
  // (e.g. trailing characters from a non-truncated overwrite).
  if (typeof value === 'string') {
    const trimmed = value.trim()
    try {
      value = JSON.parse(trimmed)
    }
    catch {
      // Try to recover: strip trailing junk after the first valid JSON array
      if (trimmed.startsWith('[')) {
        let depth = 0
        let end = -1
        for (let i = 0; i < trimmed.length; i++) {
          if (trimmed[i] === '[') {
            depth++
          }
          else if (trimmed[i] === ']') {
            depth--
          }
          if (depth === 0) {
            end = i + 1
            break
          }
        }
        if (end > 0) {
          try {
            value = JSON.parse(trimmed.slice(0, end))
          }
          catch {
            value = null
          }
        }
        else {
          value = null
        }
      }
      else {
        value = null
      }
    }
  }
  if (Array.isArray(value)) {
    return value as T[]
  }

  if (strict) {
    throw new Error(`StorageCorruptionError: unreadable array for key ${key}`)
  }

  return []
}

// In-memory store for emoji cooldowns
const emojiCooldowns = new Map<string, number>()

// Track whether storage has been initialized
let storageInitialized = false

/** Initialize storage with default values if keys do not exist yet. */
export async function initStorage(event?: H3Event) {
  if (storageInitialized) return
  try {
    // Initialize questions
    if (!await storage.hasItem('questions')) {
      await storage.setItem('questions', [])
    }

    // Initialize answers
    if (!await storage.hasItem('answers')) {
      await storage.setItem('answers', [])
    }

    // Initialize admin credentials from runtime config
    if (!await storage.hasItem('admin')) {
      const config = event
        ? useRuntimeConfig(event)
        : { adminUsername: 'admin', adminPassword: '123' }
      await storage.setItem('admin', {
        username: config.adminUsername,
        password: config.adminPassword,
      })
    }

    storageInitialized = true
  }
  catch (error: unknown) {
    logger_error('Storage initialization error:', error)
  }
}

/**
 * Process predefined questions from a JSON array and merge them into storage.
 * Skips questions whose `question_text.en` already exists.
 */
export async function processPredefinedQuestions(predefinedQuestions: InputQuestion[]): Promise<void> {
  if (!Array.isArray(predefinedQuestions) || predefinedQuestions.length === 0) return

  for (const q of predefinedQuestions) {
    if (typeof q.question_text?.en !== 'string' || q.question_text.en.trim() === '') {
      const details = JSON.stringify(q.question_text)
      throw new Error(
        `Invalid question_text in predefined questions (must have non-empty "en" property): ${details}`,
      )
    }
    if (!Array.isArray(q.answer_options) || q.answer_options.length === 0) {
      throw new Error(`Invalid answer_options in predefined questions: ${JSON.stringify(q.answer_options)}`)
    }
  }

  const existingQuestions = await getArrayItem<Question>('questions', true)
  const existingQuestionTexts = new Set(existingQuestions.map(q => q.question_text.en))

  const newQuestions: Question[] = []
  for (const q of predefinedQuestions) {
    if (!existingQuestionTexts.has(q.question_text.en)) {
      existingQuestionTexts.add(q.question_text.en)
      const id = createId()
      newQuestions.push({
        ...q,
        id,
        key: q.key || id,
        is_active: false,
        is_locked: false,
        createdAt: new Date().toISOString(),
        alreadyPublished: false,
      })
    }
  }

  if (newQuestions.length > 0) {
    await storage.setItem('questions', [
      ...existingQuestions,
      ...newQuestions,
    ])
    logger(`${newQuestions.length} new predefined questions loaded successfully.`)
  }
  else {
    logger('No new predefined questions to load.')
  }
}

// Question operations
export async function getQuestions(): Promise<Question[]> {
  await initStorage()
  return await getArrayItem<Question>('questions')
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  await initStorage()
  await storage.setItem('questions', questions)
}

export async function getActiveQuestion(): Promise<Question | undefined> {
  const questions = await getQuestions()
  return questions.find(q => q.is_active)
}

export async function createQuestion(
  questionData: Omit<Question, 'id' | 'is_active' | 'is_locked' | 'createdAt' | 'alreadyPublished'>,
): Promise<Question> {
  await initStorage()
  const questions = await getArrayItem<Question>('questions', true)
  const id = createId()
  const resolvedKey = questionData.key || id

  if (questions.some(q => q.key === resolvedKey)) {
    throw new Error(`A question with key "${resolvedKey}" already exists`)
  }

  const newQuestion: Question = {
    id,
    ...questionData,
    key: resolvedKey,
    is_locked: false,
    createdAt: new Date().toISOString(),
    alreadyPublished: false,
  }
  questions.push(newQuestion)
  await storage.setItem('questions', questions)
  return newQuestion
}

export async function publishQuestion(key: string): Promise<Question | undefined> {
  await initStorage()
  const questions = await getArrayItem<Question>('questions', true)

  // Deactivate all questions
  questions.forEach((q) => {
    q.is_active = false
  })

  // Activate the new question
  const question = questions.find(q => q.key === key)
  if (question) {
    question.is_active = true
    question.alreadyPublished = true
    await storage.setItem('questions', questions)

    // Broadcast the results (includes any previously submitted answers for this question)
    const results = await getResultsForQuestion(question.id, questions)
    broadcast('results-update', results)
  }
  return question
}

/** Deactivate the active question (answers are preserved for potential re-publishing). */
export async function unpublishActiveQuestion(): Promise<Question | undefined> {
  await initStorage()
  const questions = await getArrayItem<Question>('questions', true)
  const activeQuestion = questions.find(q => q.is_active)

  if (activeQuestion) {
    activeQuestion.is_active = false
    await storage.setItem('questions', questions)
  }

  return activeQuestion
}

export async function toggleQuestionLock(questionId: string): Promise<Question | undefined> {
  await initStorage()
  const questions = await getArrayItem<Question>('questions', true)
  const question = questions.find(q => q.id === questionId)

  if (question) {
    question.is_locked = !question.is_locked
    await storage.setItem('questions', questions)
  }

  return question
}

// Answer operations
export async function getAnswers(): Promise<Answer[]> {
  await initStorage()
  return await getArrayItem<Answer>('answers')
}

export async function saveAnswers(answers: Answer[]): Promise<void> {
  await initStorage()
  await storage.setItem('answers', answers)
}

export async function submitAnswer(answerData: Omit<Answer, 'id' | 'timestamp'>): Promise<Answer[]> {
  await initStorage()
  const questions = await getQuestions()
  const question = questions.find(q => q.id === answerData.question_id)

  if (!question) {
    throw new Error('Question not found')
  }

  if (!question.answer_options.some(option => option.text.en === answerData.selected_answer.en)) {
    throw new Error('Invalid answer option')
  }

  const answers = await getArrayItem<Answer>('answers', true)

  // Check if user already answered this question
  const existingIndex = answers.findIndex(
    a => a.question_id === answerData.question_id
      && a.user_id === answerData.user_id,
  )

  if (existingIndex >= 0) {
    // Update existing answer
    const existingAnswer = answers[existingIndex]
    if (existingAnswer) {
      answers[existingIndex] = {
        ...existingAnswer,
        selected_answer: answerData.selected_answer,
        timestamp: new Date().toISOString(),
      }
    }
  }
  else {
    // Add new answer
    const newAnswer: Answer = {
      id: createId(),
      ...answerData,
      timestamp: new Date().toISOString(),
    }
    answers.push(newAnswer)
  }

  await storage.setItem('answers', answers)
  return answers
}

export async function getAnswersForQuestion(questionId: string): Promise<Answer[]> {
  const answers = await getAnswers()
  return answers.filter(a => a.question_id === questionId)
}

export async function retractAnswer(userId: string, questionId: string): Promise<Answer[]> {
  await initStorage()
  const answers = await getArrayItem<Answer>('answers', true)
  const updatedAnswers = answers.filter(
    a => !(a.user_id === userId && a.question_id === questionId),
  )
  await storage.setItem('answers', updatedAnswers)
  return updatedAnswers
}

// Admin operations
export async function validateAdmin(username: string, password: string, event?: H3Event): Promise<boolean> {
  await initStorage(event)
  const admin = await storage.getItem<{ username: string, password: string }>('admin')
  if (!admin) return false
  return admin.username === username && admin.password === password
}

// Get results for current question
export async function getResultsForQuestion(
  questionId: string,
  allQuestions?: Question[],
  allAnswers?: Answer[],
): Promise<Results | null> {
  const questions = allQuestions || await getQuestions()
  const question = questions.find(q => q.id === questionId)
  if (!question) return null

  const answers = allAnswers || await getAnswersForQuestion(question.id)

  // Count votes for each option
  const results: Record<string, { count: number, emoji?: string }> = {}
  question.answer_options.forEach((option) => {
    if (option.text.en) {
      results[option.text.en] = { count: 0, emoji: option.emoji }
    }
  })

  answers.forEach((answer) => {
    if (answer.selected_answer.en && Object.prototype.hasOwnProperty.call(results, answer.selected_answer.en)) {
      const result = results[answer.selected_answer.en]
      if (result) {
        result.count++
      }
    }
  })

  return JSON.parse(JSON.stringify({
    question,
    results,
    totalVotes: answers.length,
    totalConnections: (await getPeers()).length,
  }))
}

export async function getCurrentResults(): Promise<Results | null> {
  const activeQuestion = await getActiveQuestion()
  if (!activeQuestion) return null
  return getResultsForQuestion(activeQuestion.id)
}

// Emoji cooldown operations

/** Removes expired entries from the cooldown map to prevent unbounded growth. */
function pruneExpiredCooldowns(cooldownMs: number): void {
  const now = Date.now()
  for (const [
    id,
    timestamp,
  ] of emojiCooldowns) {
    if (now - timestamp >= cooldownMs) {
      emojiCooldowns.delete(id)
    }
  }
}

export function checkEmojiCooldown(userId: string): boolean {
  const config = useRuntimeConfig()
  const cooldownMs = config.public.emojiCooldownMs

  pruneExpiredCooldowns(cooldownMs)

  const lastSubmission = emojiCooldowns.get(userId)
  if (lastSubmission) {
    const now = Date.now()
    if (now - lastSubmission < cooldownMs) {
      return true // Cooldown is active
    }
  }
  return false // Cooldown is over or user has not submitted before
}

/** Records the current timestamp for the given user in the emoji cooldown map. */
export function updateEmojiTimestamp(userId: string): void {
  emojiCooldowns.set(userId, Date.now())
}
