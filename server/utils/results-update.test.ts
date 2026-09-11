import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { WebSocketChannel } from '~/types'

const broadcast = vi.fn()
const getCurrentResults = vi.fn()

vi.stubGlobal('logger_error', vi.fn())
vi.mock('./storage', () => ({ getCurrentResults }))
vi.mock('./websocket', () => ({ broadcast }))

const {
  cancelPendingResultsUpdate,
  requestResultsUpdate,
} = await import('./results-update')

afterEach(() => {
  cancelPendingResultsUpdate()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('results update coordination', () => {
  it('calculates and broadcasts once after the buffer window', async () => {
    vi.useFakeTimers()
    const results = { totalVotes: 2 }
    getCurrentResults.mockResolvedValue(results)

    requestResultsUpdate()
    requestResultsUpdate()
    requestResultsUpdate()

    await vi.advanceTimersByTimeAsync(1999)
    expect(getCurrentResults).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(getCurrentResults).toHaveBeenCalledTimes(1)
    expect(broadcast).toHaveBeenCalledWith('results-update', results, WebSocketChannel.RESULTS)
  })

  it('suppresses an in-flight result after cancellation', async () => {
    vi.useFakeTimers()
    let resolveResults: (value: { totalVotes: number }) => void = () => {}
    getCurrentResults.mockReturnValue(new Promise((resolve) => {
      resolveResults = resolve
    }))

    requestResultsUpdate()
    await vi.advanceTimersByTimeAsync(2000)
    cancelPendingResultsUpdate()
    resolveResults({ totalVotes: 1 })
    await Promise.resolve()

    expect(broadcast).not.toHaveBeenCalled()
  })
})
