import type {
  Answer,
  Question,
  QuizRecap,
  QuizRecapHighlight,
  QuizRecapOption,
} from '~/types'
import {
  getCorrectAnswerTexts,
  isCorrectAnswer,
} from './quiz-results'

type QuestionStats = {
  question: Question
  answers: Answer[]
  correctAnswerTexts: Set<string>
  correctAnswerCount: number
  optionCounts: Map<string, QuizRecapOption>
}

/** Sorts questions consistently with persistent storage order. */
function compareQuestions(first: Question, second: Question): number {
  return first.sortOrder - second.sortOrder
    || first.createdAt.localeCompare(second.createdAt)
    || first.id.localeCompare(second.id)
}

/** Keeps only the latest submitted answer for each participant and question. */
function latestAnswers(answerList: Answer[]): Answer[] {
  const answersByParticipantQuestion = new Map<string, Answer>()

  for (const answer of answerList) {
    const key = `${answer.question_id}\u0000${answer.user_id}`
    const existing = answersByParticipantQuestion.get(key)
    const isNewer = !existing
      || answer.timestamp > existing.timestamp
      || (answer.timestamp === existing.timestamp && answer.id > existing.id)
    if (isNewer) {
      answersByParticipantQuestion.set(key, answer)
    }
  }

  return [
    ...answersByParticipantQuestion.values(),
  ]
}

function createQuestionStats(question: Question, answerList: Answer[]): QuestionStats {
  const optionCounts = new Map<string, QuizRecapOption>()
  for (const option of question.answer_options) {
    optionCounts.set(option.text.en.toLowerCase(), {
      text: option.text,
      emoji: option.emoji,
      count: 0,
    })
  }

  const correctAnswerTexts = getCorrectAnswerTexts(question)
  let correctAnswerCount = 0
  for (const answer of answerList) {
    if (isCorrectAnswer(correctAnswerTexts, answer.selected_answer)) correctAnswerCount++
    const selectedOption = optionCounts.get(answer.selected_answer.en.toLowerCase())
    if (selectedOption) selectedOption.count++
  }

  return {
    question,
    answers: answerList,
    correctAnswerTexts,
    correctAnswerCount,
    optionCounts,
  }
}

function questionReference(question: Question) {
  return { id: question.id, text: question.question_text }
}

function compareStats(first: QuestionStats, second: QuestionStats): number {
  return compareQuestions(first.question, second.question)
}

/** Builds anonymized recap totals and question highlights for published quiz questions. */
export function buildQuizRecap(questionList: Question[], answerList: Answer[]): QuizRecap {
  const publishedQuestions = questionList.filter(question => question.alreadyPublished).sort(compareQuestions)
  const publishedQuestionIds = new Set(publishedQuestions.map(question => question.id))
  const answers = latestAnswers(answerList.filter(answer => publishedQuestionIds.has(answer.question_id)))
  const answersByQuestion = new Map<string, Answer[]>()

  for (const answer of answers) {
    const questionAnswers = answersByQuestion.get(answer.question_id) ?? []
    questionAnswers.push(answer)
    answersByQuestion.set(answer.question_id, questionAnswers)
  }

  const stats = publishedQuestions.map(question => createQuestionStats(
    question,
    answersByQuestion.get(question.id) ?? [],
  ))
  const scoredStats = stats.filter(stat => stat.correctAnswerTexts.size > 0)
  const answeredStats = stats.filter(stat => stat.answers.length > 0)
  const evaluableStats = scoredStats.filter(stat => stat.answers.length > 0)
  const highlights: QuizRecapHighlight[] = []

  const bestKnown = [
    ...evaluableStats,
  ].sort((first, second) =>
    second.correctAnswerCount * first.answers.length - first.correctAnswerCount * second.answers.length
    || compareStats(first, second),
  )[0]
  if (bestKnown) {
    highlights.push({
      kind: 'best-known',
      question: questionReference(bestKnown.question),
      answerCount: bestKnown.answers.length,
      correctAnswerCount: bestKnown.correctAnswerCount,
    })
  }

  const hardest = [
    ...evaluableStats,
  ]
    .filter(stat => stat.question.id !== bestKnown?.question.id)
    .sort((first, second) =>
      first.correctAnswerCount * second.answers.length - second.correctAnswerCount * first.answers.length
      || compareStats(first, second),
    )[0]
  if (hardest) {
    highlights.push({
      kind: 'hardest',
      question: questionReference(hardest.question),
      answerCount: hardest.answers.length,
      correctAnswerCount: hardest.correctAnswerCount,
    })
  }

  const mostAnswered = [
    ...answeredStats,
  ].sort((first, second) =>
    second.answers.length - first.answers.length || compareStats(first, second),
  )[0]
  if (mostAnswered) {
    highlights.push({
      kind: 'most-answered',
      question: questionReference(mostAnswered.question),
      answerCount: mostAnswered.answers.length,
    })
  }

  const closestCall = [
    ...answeredStats,
  ]
    .map((stat) => {
      const leadingOptions = [
        ...stat.optionCounts.values(),
      ]
        .filter(option => option.count > 0)
        .sort((first, second) => second.count - first.count || first.text.en.localeCompare(second.text.en))
        .slice(0, 2)

      return leadingOptions.length === 2
        ? { stat, leadingOptions: leadingOptions as [QuizRecapOption, QuizRecapOption] }
        : undefined
    })
    .filter((candidate): candidate is {
      leadingOptions: [QuizRecapOption, QuizRecapOption]
      stat: QuestionStats
    } => Boolean(candidate))
    .sort((first, second) =>
      (first.leadingOptions[0].count - first.leadingOptions[1].count)
      - (second.leadingOptions[0].count - second.leadingOptions[1].count)
      || compareStats(first.stat, second.stat),
    )[0]
  if (closestCall) {
    highlights.push({
      kind: 'closest-call',
      question: questionReference(closestCall.stat.question),
      answerCount: closestCall.stat.answers.length,
      leadingOptions: closestCall.leadingOptions,
    })
  }

  return {
    totals: {
      publishedQuestions: publishedQuestions.length,
      answeredQuestions: answeredStats.length,
      participants: new Set(answers.map(answer => answer.user_id)).size,
      answers: answers.length,
      scoredAnswers: scoredStats.reduce((total, stat) => total + stat.answers.length, 0),
      correctAnswers: scoredStats.reduce((total, stat) => total + stat.correctAnswerCount, 0),
    },
    highlights,
  }
}
