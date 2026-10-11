import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { WebSocketChannel } from '~/types'

const getPeerCount = vi.fn()
const getQuestions = vi.fn()
const getAnswersForQuestion = vi.fn()
vi.stubGlobal('getAnswersForQuestion', getAnswersForQuestion)
vi.stubGlobal('buildQuestionOptionResults', () => ({ Yes: { count: 3 } }))
vi.stubGlobal('throwApiError', (status: number, code: string) => { throw new Error(`${status}:${code}`) })

vi.stubGlobal('getPeerCount', getPeerCount)
vi.stubGlobal('getQuestions', getQuestions)

const { getPresenterCurrentState } = await import('./presenter')

afterEach(() => {
  vi.clearAllMocks()
})

describe('presenter state', () => {
  it('uses only participant WebSockets for the user total', async () => {
    getQuestions.mockResolvedValue([])
    getPeerCount.mockReturnValue(42)

    await expect(getPresenterCurrentState()).resolves.toMatchObject({
      hasActiveQuestion: false,
      totalUsers: 42,
    })
    expect(getPeerCount).toHaveBeenCalledWith(WebSocketChannel.DEFAULT)
  })
})


describe('selected Presenter aggregates', () => {
  it('retains inactive question counts in the existing response shape', async () => {
    getQuestions.mockResolvedValue([
      {
        key: 'closed', id: 'closed', alreadyPublished: true, is_active: false,
        is_disabled: false, is_locked: true, answer_options: [
          { text: { en: 'Yes' } },
        ],
      },
    ])
    getAnswersForQuestion.mockResolvedValue([
      {},
      {},
      {},
    ])
    getPeerCount.mockReturnValue(4)
    expect(await getPresenterCurrentState('closed')).toMatchObject({
      hasActiveQuestion: false, receivedAnswers: 3, totalUsers: 4,
      currentQuestion: { key: 'closed', is_active: false, alreadyPublished: true, answer_options: [
        { count: 3, percent: 100 },
      ] },
    })
  })
  it.each([
    false,
    true,
  ])('rejects absent or disabled selected questions (%s)', async (disabled) => {
    getQuestions.mockResolvedValue(disabled ? [
      { key: 'disabled', is_disabled: true },
    ] : [])
    await expect(getPresenterCurrentState('disabled')).rejects.toThrow('404:quiz.question_not_found')
  })
})
