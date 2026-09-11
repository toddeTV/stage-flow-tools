import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { WebSocketChannel } from '~/types'

const broadcast = vi.fn()
const cancelPendingResultsUpdate = vi.fn()
const getResultsForQuestion = vi.fn()
const publishQuestion = vi.fn()
const readValidatedRequestBody = vi.fn()
const verifyAdmin = vi.fn()

vi.stubGlobal('broadcast', broadcast)
vi.stubGlobal('cancelPendingResultsUpdate', cancelPendingResultsUpdate)
vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('getResultsForQuestion', getResultsForQuestion)
vi.stubGlobal('publishQuestion', publishQuestion)
vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
vi.stubGlobal('verifyAdmin', verifyAdmin)

const { default: publishQuestionRoute } = await import('./publish.post')

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/questions/publish', () => {
  it('cancels buffered results and broadcasts the new state immediately', async () => {
    const question = {
      answer_options: [
        { text: { en: 'Yes' } },
        { text: { en: 'No' } },
      ],
      createdAt: '2026-09-11T10:00:00.000Z',
      id: 'question-id',
      is_active: true,
      is_locked: false,
      question_text: { en: 'Question' },
    }
    const results = { question, totalConnections: 0, totalVotes: 0 }
    readValidatedRequestBody.mockResolvedValue({ key: 'question-key' })
    publishQuestion.mockResolvedValue(question)
    getResultsForQuestion.mockResolvedValue(results)

    await expect(publishQuestionRoute({} as never)).resolves.toBe(question)
    expect(cancelPendingResultsUpdate).toHaveBeenCalledOnce()
    expect(broadcast).toHaveBeenCalledWith('results-update', results, WebSocketChannel.RESULTS)
    expect(cancelPendingResultsUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      getResultsForQuestion.mock.invocationCallOrder[0]!,
    )
  })
})
