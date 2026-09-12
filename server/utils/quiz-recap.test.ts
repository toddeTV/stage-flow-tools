import { describe, expect, it } from 'vite-plus/test'
import type {
  Answer,
  Question,
} from '~/types'
import { buildQuizRecap } from './quiz-recap'

function question(
  id: string,
  sortOrder: number,
  options: Question['answer_options'],
  overrides: Partial<Question> = {},
): Question {
  return {
    id,
    key: id,
    question_text: { en: `${id} question` },
    answer_options: options,
    is_disabled: false,
    is_locked: false,
    sortOrder,
    createdAt: '2026-09-03T00:00:00.000Z',
    alreadyPublished: true,
    ...overrides,
  }
}

function answer(
  id: string,
  questionId: string,
  userId: string,
  selectedAnswer: string,
  timestamp = '2026-09-03T00:00:00.000Z',
): Answer {
  return {
    id,
    question_id: questionId,
    user_id: userId,
    user_nickname: `${userId} nickname`,
    selected_answer: { en: selectedAnswer },
    timestamp,
  }
}

const binaryOptions = [
  { emoji: '⭐', text: { en: 'Yes' } },
  { text: { en: 'No' } },
]

function binaryAnswers(questionId: string, correctAnswerCount: number, answerCount: number): Answer[] {
  return Array.from({ length: answerCount }, (_, index) => answer(
    `${questionId}-${index}`,
    questionId,
    `${questionId}-user-${index}`,
    index < correctAnswerCount ? 'Yes' : 'No',
  ))
}

describe('buildQuizRecap', () => {
  it('builds anonymized totals and all ordered highlights from published questions', () => {
    const known = question('known', 0, binaryOptions)
    const hard = question('hard', 1, binaryOptions)
    const popular = question('popular', 2, binaryOptions)
    const close = question('close', 3, binaryOptions)
    const unpublished = question('unpublished', 4, binaryOptions, { alreadyPublished: false })

    const recap = buildQuizRecap([
      close,
      hard,
      unpublished,
      popular,
      known,
    ], [
      answer('known-one', known.id, 'one', 'yes'),
      answer('known-two', known.id, 'two', 'YES'),
      answer('known-three', known.id, 'three', 'Yes'),
      answer('known-stale', known.id, 'four', 'Removed option'),
      answer('known-old', known.id, 'five', 'No', '2026-09-03T00:00:00.000Z'),
      answer('known-latest', known.id, 'five', 'Yes', '2026-09-03T00:00:01.000Z'),
      answer('hard-one', hard.id, 'one', 'No'),
      answer('hard-two', hard.id, 'two', 'No'),
      answer('hard-six', hard.id, 'six', 'No'),
      answer('popular-one', popular.id, 'one', 'Yes'),
      answer('popular-two', popular.id, 'two', 'No'),
      answer('popular-three', popular.id, 'three', 'No'),
      answer('popular-four', popular.id, 'four', 'No'),
      answer('popular-five', popular.id, 'five', 'No'),
      answer('popular-six', popular.id, 'six', 'No'),
      answer('close-one', close.id, 'one', 'Yes'),
      answer('close-two', close.id, 'two', 'Yes'),
      answer('close-three', close.id, 'three', 'Yes'),
      answer('close-four', close.id, 'four', 'No'),
      answer('close-five', close.id, 'five', 'No'),
      answer('unpublished-one', unpublished.id, 'one', 'Yes'),
    ])

    expect(recap).toEqual({
      totals: {
        publishedQuestions: 4,
        answeredQuestions: 4,
        participants: 6,
        answers: 19,
        scoredAnswers: 19,
        correctAnswers: 8,
      },
      highlights: [
        {
          kind: 'best-known',
          question: { id: known.id, text: known.question_text },
          answerCount: 5,
          correctAnswerCount: 4,
        },
        {
          kind: 'hardest',
          question: { id: hard.id, text: hard.question_text },
          answerCount: 3,
          correctAnswerCount: 0,
        },
        {
          kind: 'most-answered',
          question: { id: popular.id, text: popular.question_text },
          answerCount: 6,
        },
        {
          kind: 'closest-call',
          question: { id: close.id, text: close.question_text },
          answerCount: 5,
          leadingOptions: [
            { text: { en: 'Yes' }, emoji: '⭐', count: 3 },
            { text: { en: 'No' }, count: 2 },
          ],
        },
      ],
    })
  })

  it('keeps unanswered and unscored questions in totals without inventing score highlights', () => {
    const noCorrectOption = question('no-correct', 0, binaryOptions.map(option => ({ ...option, emoji: undefined })))
    const noAnswers = question('no-answers', 1, binaryOptions)

    expect(buildQuizRecap([
      noCorrectOption,
      noAnswers,
    ], [
      answer('no-correct-answer', noCorrectOption.id, 'one', 'Yes'),
    ])).toEqual({
      totals: {
        publishedQuestions: 2,
        answeredQuestions: 1,
        participants: 1,
        answers: 1,
        scoredAnswers: 0,
        correctAnswers: 0,
      },
      highlights: [
        {
          kind: 'most-answered',
          question: { id: noCorrectOption.id, text: noCorrectOption.question_text },
          answerCount: 1,
        },
      ],
    })
  })

  it('uses persistent question order to resolve highlight ties', () => {
    const later = question('later', 0, binaryOptions, { createdAt: '2026-09-04T00:00:00.000Z' })
    const first = question('first', 0, binaryOptions, { createdAt: '2026-09-03T00:00:00.000Z' })
    const third = question('third', 1, binaryOptions)

    const recap = buildQuizRecap([
      later,
      third,
      first,
    ], [
      answer('later-answer', later.id, 'one', 'Yes'),
      answer('first-answer', first.id, 'two', 'Yes'),
      answer('third-answer', third.id, 'three', 'Yes'),
    ])

    expect(recap.highlights.slice(0, 3)).toEqual([
      {
        kind: 'best-known',
        question: { id: first.id, text: first.question_text },
        answerCount: 1,
        correctAnswerCount: 1,
      },
      {
        kind: 'hardest',
        question: { id: later.id, text: later.question_text },
        answerCount: 1,
        correctAnswerCount: 1,
      },
      {
        kind: 'most-answered',
        question: { id: first.id, text: first.question_text },
        answerCount: 1,
      },
    ])
  })

  it('scores every starred option with case-insensitive English labels', () => {
    const multipleCorrect = question('multiple-correct', 0, [
      { emoji: '⭐', text: { en: 'First' } },
      { emoji: '⭐', text: { en: 'Second' } },
      { text: { en: 'No' } },
    ])

    const recap = buildQuizRecap([
      multipleCorrect,
    ], [
      answer('first-answer', multipleCorrect.id, 'one', 'first'),
      answer('second-answer', multipleCorrect.id, 'two', 'SECOND'),
      answer('wrong-answer', multipleCorrect.id, 'three', 'No'),
    ])

    expect(recap.totals).toMatchObject({
      answers: 3,
      scoredAnswers: 3,
      correctAnswers: 2,
    })
    expect(recap.highlights[0]).toMatchObject({
      kind: 'best-known',
      answerCount: 3,
      correctAnswerCount: 2,
    })
  })

  it('compares exact success ratios before display rounding', () => {
    const lowerRatio = question('lower-ratio', 0, binaryOptions)
    const higherRatio = question('higher-ratio', 1, binaryOptions)

    const recap = buildQuizRecap([
      lowerRatio,
      higherRatio,
    ], [
      ...binaryAnswers(lowerRatio.id, 15, 22),
      ...binaryAnswers(higherRatio.id, 13, 19),
    ])

    expect(recap.highlights.slice(0, 2)).toMatchObject([
      { kind: 'best-known', question: { id: higherRatio.id } },
      { kind: 'hardest', question: { id: lowerRatio.id } },
    ])
  })

  it('omits closest-call until two recognized options have positive votes', () => {
    const oneSided = question('one-sided', 0, binaryOptions)

    const recap = buildQuizRecap([
      oneSided,
    ], [
      answer('known-answer', oneSided.id, 'one', 'Yes'),
      answer('stale-answer', oneSided.id, 'two', 'Removed option'),
    ])

    expect(recap.highlights).not.toContainEqual(expect.objectContaining({ kind: 'closest-call' }))
  })

  it('keeps only the latest stored answer for each participant and question', () => {
    const questionWithReplacement = question('replacement', 0, binaryOptions)

    const recap = buildQuizRecap([
      questionWithReplacement,
    ], [
      answer('old-answer', questionWithReplacement.id, 'one', 'Yes', '2026-09-03T00:00:00.000Z'),
      answer('latest-answer', questionWithReplacement.id, 'one', 'No', '2026-09-03T00:00:01.000Z'),
    ])

    expect(recap.totals).toMatchObject({
      participants: 1,
      answers: 1,
      scoredAnswers: 1,
      correctAnswers: 0,
    })
    expect(recap.highlights[0]).toMatchObject({
      kind: 'best-known',
      answerCount: 1,
      correctAnswerCount: 0,
    })
  })
})
