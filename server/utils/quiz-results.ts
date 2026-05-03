import type {
  Answer,
  Question,
  Results,
} from '~/types'

/** Builds per-option vote counts keyed by the English option label. */
export function buildQuestionOptionResults(question: Question, answerList: Answer[]): Results['results'] {
  const results = Object.create(null) as Results['results']
  const normalizedOptionLabels = new Set<string>()

  for (const option of question.answer_options) {
    const resultKey = option.text.en
    const normalizedResultKey = resultKey.toLowerCase()

    if (normalizedOptionLabels.has(normalizedResultKey)) {
      throw new Error(`Duplicate answer option label is not supported: "${resultKey}"`)
    }

    normalizedOptionLabels.add(normalizedResultKey)

    results[resultKey] = {
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

  return results
}
