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
const getResultsForQuestion = vi.fn()
const importQuestionPackage = vi.fn()
const readValidatedRequestBody = vi.fn()
const verifyAdmin = vi.fn()

vi.stubGlobal('broadcast', broadcast)
vi.stubGlobal('clearScheduledResultsUpdate', clearScheduledResultsUpdate)
vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('getResultsForQuestion', getResultsForQuestion)
vi.stubGlobal('importQuestionPackage', importQuestionPackage)
vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
vi.stubGlobal('verifyAdmin', verifyAdmin)

const { default: importQuestions } = await import('./import.post')

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/questions/import', () => {
  it('broadcasts a committed active-question update and returns actual counts', async () => {
    const activeQuestion = {
      answer_options: [
        { text: { en: 'Yes' } },
        { text: { en: 'No' } },
      ],
      alreadyPublished: true,
      createdAt: '2026-09-04T00:00:00.000Z',
      id: 'question-id',
      is_active: true,
      is_disabled: false,
      is_locked: false,
      key: 'question-key',
      question_text: { en: 'Updated question' },
      sortOrder: 0,
    }

    readValidatedRequestBody.mockResolvedValue({})
    importQuestionPackage.mockResolvedValue({
      activeQuestion,
      createdCount: 2,
      updatedCount: 1,
    })
    getResultsForQuestion.mockResolvedValue({ question: activeQuestion })

    await expect(importQuestions({} as never)).resolves.toEqual({
      createdCount: 2,
      updatedCount: 1,
    })
    expect(verifyAdmin).toHaveBeenCalled()
    expect(clearScheduledResultsUpdate).toHaveBeenCalledWith(WebSocketChannel.RESULTS)
    expect(broadcast).toHaveBeenCalledWith('new-question', {
      answer_options: activeQuestion.answer_options,
      createdAt: activeQuestion.createdAt,
      id: activeQuestion.id,
      is_active: true,
      is_locked: false,
      question_text: activeQuestion.question_text,
    })
    expect(broadcast).toHaveBeenCalledWith(
      'results-update',
      { question: activeQuestion },
      WebSocketChannel.RESULTS,
    )
  })
})
