import {
  eq,
  or,
} from 'drizzle-orm'
import type { Question } from '~/types'
import {
  answers,
  questions,
} from '../schema'
import {
  getDatabase,
  initStorage,
} from './core'
import {
  getActiveQuestion,
  getQuestionById,
  getQuestions,
} from './questions'

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

  return getActiveQuestion()
}

/** Returns the next enabled question after the active one in persistent queue order. */
export async function getNextPublishableQuestion(): Promise<Question | undefined> {
  const questionList = await getQuestions()
  const activeIndex = questionList.findIndex(question => question.is_active)
  const followingQuestions = activeIndex < 0
    ? questionList
    : questionList.slice(activeIndex + 1)

  return followingQuestions.find(question => !question.is_disabled)
}

/** Swaps a question with its adjacent queue item. */
export async function moveQuestion(questionId: string, direction: 'up' | 'down'): Promise<Question | undefined> {
  const questionList = await getQuestions()
  const currentIndex = questionList.findIndex(question => question.id === questionId)

  if (currentIndex < 0) {
    return undefined
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  const question = questionList[currentIndex]
  const targetQuestion = questionList[targetIndex]

  if (!question || !targetQuestion) {
    return question
  }

  getDatabase().transaction((transaction) => {
    transaction
      .update(questions)
      .set({ sortOrder: targetQuestion.sortOrder })
      .where(eq(questions.id, question.id))
      .run()
    transaction
      .update(questions)
      .set({ sortOrder: question.sortOrder })
      .where(eq(questions.id, targetQuestion.id))
      .run()
  })

  return getQuestionById(questionId)
}

/** Toggles whether a question participates in automatic queue publication. */
export async function toggleQuestionDisabled(questionId: string): Promise<Question | undefined> {
  await initStorage()

  const question = getQuestionById(questionId)

  if (!question) {
    return undefined
  }

  getDatabase()
    .update(questions)
    .set({ isDisabled: !question.is_disabled })
    .where(eq(questions.id, questionId))
    .run()

  return {
    ...question,
    is_disabled: !question.is_disabled,
  }
}

/** Deletes a question and all of its submitted answers. */
export async function deleteQuestion(questionId: string): Promise<Question | undefined> {
  await initStorage()

  const question = getQuestionById(questionId)

  if (!question) {
    return undefined
  }

  getDatabase().transaction((transaction) => {
    transaction.delete(answers).where(eq(answers.questionId, questionId)).run()
    transaction.delete(questions).where(eq(questions.id, questionId)).run()
  })

  return question
}

/** Deletes every question and submitted answer in one transaction. */
export async function deleteAllQuestions(): Promise<number> {
  await initStorage()

  return getDatabase().transaction((transaction) => {
    const deletedQuestionCount = transaction
      .select({ id: questions.id })
      .from(questions)
      .all()
      .length

    transaction.delete(answers).run()
    transaction.delete(questions).run()

    return deletedQuestionCount
  })
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
