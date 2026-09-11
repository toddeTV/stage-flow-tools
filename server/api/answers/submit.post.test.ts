import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'

const getActiveQuestion = vi.fn()
const readValidatedRequestBody = vi.fn()
const requestResultsUpdate = vi.fn()
const submitAnswer = vi.fn()

vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('getActiveQuestion', getActiveQuestion)
vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
vi.stubGlobal('requestResultsUpdate', requestResultsUpdate)
vi.stubGlobal('submitAnswer', submitAnswer)

const { default: submitAnswerRoute } = await import('./submit.post')

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/answers/submit', () => {
  it('stores the answer before requesting one buffered results update', async () => {
    const activeQuestion = {
      answer_options: [
        { text: { de: 'Ja', en: 'Yes' } },
        { text: { de: 'Nein', en: 'No' } },
      ],
      id: 'question-id',
      is_locked: false,
    }
    getActiveQuestion.mockResolvedValue(activeQuestion)
    readValidatedRequestBody.mockResolvedValue({
      selected_answer: { en: 'yes' },
      user_id: 'participant-id',
      user_nickname: 'Participant',
    })

    await expect(submitAnswerRoute({} as never)).resolves.toEqual({ success: true })
    expect(submitAnswer).toHaveBeenCalledWith({
      question_id: activeQuestion.id,
      selected_answer: activeQuestion.answer_options[0]!.text,
      user_id: 'participant-id',
      user_nickname: 'Participant',
    })
    expect(requestResultsUpdate).toHaveBeenCalledOnce()
    expect(submitAnswer.mock.invocationCallOrder[0]).toBeLessThan(
      requestResultsUpdate.mock.invocationCallOrder[0]!,
    )
  })
})
