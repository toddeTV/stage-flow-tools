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
