import type {
  Question,
  QuestionPackage,
} from '~/types'
import {
  QUESTION_PACKAGE_FORMAT,
  QUESTION_PACKAGE_VERSION,
} from '#shared/utils/validation'

export type QuestionPackageImportPreview = {
  createCount: number
  updateCount: number
}

/** Builds a portable V1 package without answers or runtime lifecycle state. */
export function createQuestionPackage(questions: Question[]): QuestionPackage {
  if (questions.length === 0) {
    throw new Error('Question packages require at least one question')
  }

  return {
    format: QUESTION_PACKAGE_FORMAT,
    version: QUESTION_PACKAGE_VERSION,
    questions: questions.map(question => ({
      key: question.key,
      question_text: question.question_text,
      answer_options: question.answer_options,
      note: question.note,
      is_disabled: question.is_disabled,
    })),
  }
}

/** Counts package rows that will create a question or update a matching key. */
export function getQuestionPackageImportPreview(
  questionPackage: QuestionPackage,
  existingQuestions: Question[],
): QuestionPackageImportPreview {
  const existingKeys = new Set(existingQuestions.map(question => question.key))
  let createCount = 0
  let updateCount = 0

  for (const question of questionPackage.questions) {
    if (question.key && existingKeys.has(question.key)) {
      updateCount += 1
    }
    else {
      createCount += 1
    }
  }

  return {
    createCount,
    updateCount,
  }
}

export function stringifyQuestionPackage(questionPackage: QuestionPackage): string {
  return JSON.stringify(questionPackage, null, 2)
}
