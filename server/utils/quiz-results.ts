import type {
  Answer,
  Question,
  Results,
} from '~/types'

/** Builds per-option vote counts keyed by the English option label. */
export function buildQuestionOptionResults(question: Question, answerList: Answer[]): Results['results'] {
  const results: Results['results'] = {}

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

  return results
}
