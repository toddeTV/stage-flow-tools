import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'

const getAnswers = vi.fn()
const getQuestions = vi.fn()
const verifyAdmin = vi.fn()

vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('getAnswers', getAnswers)
vi.stubGlobal('getQuestions', getQuestions)
vi.stubGlobal('verifyAdmin', verifyAdmin)

const { default: recapRoute } = await import('./recap.get')

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/results/recap', () => {
  it('requires admin access and returns only aggregate recap data', async () => {
    getQuestions.mockResolvedValue([
      {
        id: 'question-id',
        key: 'question-key',
        question_text: { en: 'Question' },
        answer_options: [
          { emoji: '⭐', text: { en: 'Correct' } },
          { text: { en: 'Incorrect' } },
        ],
        is_disabled: false,
        is_locked: false,
        sortOrder: 0,
        createdAt: '2026-09-03T00:00:00.000Z',
        alreadyPublished: true,
      },
    ])
    getAnswers.mockResolvedValue([
      {
        id: 'answer-id',
        question_id: 'question-id',
        user_id: 'participant-id',
        user_nickname: 'Participant nickname',
        selected_answer: { en: 'Correct' },
        timestamp: '2026-09-03T00:00:00.000Z',
      },
    ])

    const result = await recapRoute({} as never)

    expect(verifyAdmin).toHaveBeenCalledOnce()
    expect(getQuestions).toHaveBeenCalledOnce()
    expect(getAnswers).toHaveBeenCalledOnce()
    expect(result).toEqual({
      totals: {
        publishedQuestions: 1,
        answeredQuestions: 1,
        participants: 1,
        answers: 1,
        scoredAnswers: 1,
        correctAnswers: 1,
      },
      highlights: [
        {
          kind: 'best-known',
          question: { id: 'question-id', text: { en: 'Question' } },
          answerCount: 1,
          correctAnswerCount: 1,
        },
        {
          kind: 'most-answered',
          question: { id: 'question-id', text: { en: 'Question' } },
          answerCount: 1,
        },
      ],
    })
    expect(JSON.stringify(result)).not.toContain('participant-id')
    expect(JSON.stringify(result)).not.toContain('Participant nickname')
  })

  it('stops before reading quiz data when authentication fails', async () => {
    const error = new Error('not authenticated')
    verifyAdmin.mockRejectedValueOnce(error)

    await expect(recapRoute({} as never)).rejects.toBe(error)
    expect(getQuestions).not.toHaveBeenCalled()
    expect(getAnswers).not.toHaveBeenCalled()
  })
})
