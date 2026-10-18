import {
  and,
  asc,
  desc,
  eq,
  ne,
} from 'drizzle-orm'
import type {
  InputQuestion,
  Question,
  QuestionPackage,
} from '~/types'
import {
  createQuestionInsert,
  createStoredQuestionInsert,
  deserializeQuestion,
} from '../question-records'
import {
  answers,
  questions,
} from '../schema'
import {
  getDatabase,
  initStorage,
} from './core'

export class QuestionAnswerOptionsResetRequiredError extends Error {
  constructor() {
    super('Updating answer options with submitted answers requires a reset')
    this.name = 'QuestionAnswerOptionsResetRequiredError'
  }
}

export class QuestionKeyConflictError extends Error {
  constructor() {
    super('A question already uses this key')
    this.name = 'QuestionKeyConflictError'
  }
}

export type QuestionPackageImportResult = {
  createdCount: number
  updatedCount: number
}

export function getQuestionById(questionId: string): Question | undefined {
  const row = getDatabase()
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .get()

  return row ? deserializeQuestion(row) : undefined
}

function localizedStringsAreEqual(
  first: Question['question_text'],
  second: Question['question_text'],
): boolean {
  const firstEntries = Object.entries(first)

  return firstEntries.length === Object.keys(second).length
    && firstEntries.every(([
      locale,
      value,
    ]) => second[locale] === value)
}

function answerOptionsHaveChanged(
  currentOptions: Question['answer_options'],
  updatedOptions: InputQuestion['answer_options'],
): boolean {
  return currentOptions.length !== updatedOptions.length
    || currentOptions.some((currentOption, index) => {
      const updatedOption = updatedOptions[index]

      return !updatedOption
        || currentOption.emoji !== updatedOption.emoji
        || !localizedStringsAreEqual(currentOption.text, updatedOption.text)
    })
}

export async function getQuestions(): Promise<Question[]> {
  await initStorage()

  return getDatabase()
    .select()
    .from(questions)
    .orderBy(asc(questions.sortOrder), asc(questions.createdAt), asc(questions.id))
    .all()
    .map(deserializeQuestion)
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
  questionData: InputQuestion,
): Promise<Question> {
  await initStorage()

  const lastQuestion = getDatabase()
    .select({ sortOrder: questions.sortOrder })
    .from(questions)
    .orderBy(desc(questions.sortOrder), desc(questions.createdAt), desc(questions.id))
    .get()
  const row = createQuestionInsert(questionData as InputQuestion, {
    sortOrder: (lastQuestion?.sortOrder ?? -1) + 1,
  })

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

/** Adds a package atomically, rejecting keys that already exist. */
export async function importQuestionPackage(
  questionPackage: QuestionPackage,
): Promise<QuestionPackageImportResult> {
  await initStorage()

  return getDatabase().transaction((transaction) => {
    const storedQuestions = transaction.select().from(questions).all()
    const storedKeys = new Set(storedQuestions.map(question => question.key))
    let nextSortOrder = Math.max(-1, ...storedQuestions.map(question => question.sortOrder)) + 1

    for (const packageQuestion of questionPackage.questions) {
      if (packageQuestion.key && storedKeys.has(packageQuestion.key)) {
        throw new QuestionKeyConflictError()
      }

      const questionRow = createQuestionInsert({
        key: packageQuestion.key ?? '',
        question_text: packageQuestion.question_text,
        answer_options: packageQuestion.answer_options,
        note: packageQuestion.note,
      }, {
        authoredAt: packageQuestion.authoredAt,
        isDisabled: packageQuestion.is_disabled,
        sortOrder: nextSortOrder,
      })

      transaction.insert(questions).values(questionRow).run()
      storedKeys.add(questionRow.key)
      nextSortOrder += 1
    }

    return { createdCount: questionPackage.questions.length, updatedCount: 0 }
  })
}

/** Updates a question and resets submitted answers only when explicitly confirmed. */
export async function updateQuestion(
  questionId: string,
  updates: Pick<InputQuestion, 'key' | 'question_text' | 'answer_options' | 'note'>,
  options: { resetAnswers?: boolean } = {},
): Promise<{ question: Question, answersReset: boolean } | undefined> {
  await initStorage()

  const question = getQuestionById(questionId)

  if (!question) {
    return undefined
  }

  const updatedQuestion = {
    ...question,
    ...updates,
    key: updates.key?.trim() || question.key.trim() || question.id,
  } satisfies Question

  const existingQuestion = getDatabase()
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.key, updatedQuestion.key), ne(questions.id, questionId)))
    .get()

  if (existingQuestion) {
    throw new Error(`A question with key "${updatedQuestion.key}" already exists`)
  }

  const updatedRow = createStoredQuestionInsert(updatedQuestion)
  const answerOptionsChanged = answerOptionsHaveChanged(question.answer_options, updates.answer_options)

  const answersReset = getDatabase().transaction((transaction) => {
    const submittedAnswer = transaction
      .select({ id: answers.id })
      .from(answers)
      .where(eq(answers.questionId, questionId))
      .limit(1)
      .get()

    if (answerOptionsChanged && submittedAnswer) {
      if (!options.resetAnswers) {
        throw new QuestionAnswerOptionsResetRequiredError()
      }

      transaction.delete(answers).where(eq(answers.questionId, questionId)).run()
    }

    transaction
      .update(questions)
      .set({
        key: updatedRow.key,
        questionText: updatedRow.questionText,
        answerOptions: updatedRow.answerOptions,
        note: updatedRow.note,
      })
      .where(eq(questions.id, questionId))
      .run()

    return answerOptionsChanged && Boolean(submittedAnswer)
  })

  const storedQuestion = getQuestionById(questionId)

  return storedQuestion
    ? {
      answersReset,
      question: storedQuestion,
    }
    : undefined
}
