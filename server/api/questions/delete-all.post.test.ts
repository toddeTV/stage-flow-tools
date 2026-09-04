import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { WebSocketChannel } from '~/types'

const broadcast = vi.fn()
const clearScheduledResultsUpdate = vi.fn()
const deleteAllQuestions = vi.fn()
const readValidatedRequestBody = vi.fn()
const verifyAdmin = vi.fn()

vi.stubGlobal('broadcast', broadcast)
vi.stubGlobal('clearScheduledResultsUpdate', clearScheduledResultsUpdate)
vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('deleteAllQuestions', deleteAllQuestions)
vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
vi.stubGlobal('verifyAdmin', verifyAdmin)

const { default: deleteAllQuestionsRoute } = await import('./delete-all.post')

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/questions/delete-all', () => {
  it('clears pending live state after deleting every question and answer', async () => {
    deleteAllQuestions.mockResolvedValue(3)

    await expect(deleteAllQuestionsRoute({} as never)).resolves.toEqual({
      deletedQuestionCount: 3,
      success: true,
    })
    expect(verifyAdmin).toHaveBeenCalled()
    expect(clearScheduledResultsUpdate).toHaveBeenCalledWith(WebSocketChannel.RESULTS)
    expect(broadcast).toHaveBeenCalledWith('new-question', null)
    expect(broadcast).toHaveBeenCalledWith('results-update', null, WebSocketChannel.RESULTS)
  })
})
