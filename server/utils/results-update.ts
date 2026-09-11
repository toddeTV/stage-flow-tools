import { WebSocketChannel } from '~/types'
import { getCurrentResults } from './storage'
import { broadcast } from './websocket'

const RESULTS_UPDATE_DELAY_MS = 2000

let resultsUpdateGeneration = 0
let resultsUpdateTimeoutId: ReturnType<typeof setTimeout> | undefined

/** Coalesces result changes and calculates one fresh snapshot after the delay. */
export function requestResultsUpdate(): void {
  if (resultsUpdateTimeoutId !== undefined) {
    return
  }

  const scheduledGeneration = resultsUpdateGeneration

  resultsUpdateTimeoutId = setTimeout(async () => {
    resultsUpdateTimeoutId = undefined

    try {
      const results = await getCurrentResults()

      if (scheduledGeneration === resultsUpdateGeneration && results) {
        broadcast('results-update', results, WebSocketChannel.RESULTS)
      }
    }
    catch (error: unknown) {
      logger_error('Results update error:', error)
    }
  }, RESULTS_UPDATE_DELAY_MS)
}

/** Cancels pending and suppresses already-running stale result updates. */
export function cancelPendingResultsUpdate(): void {
  resultsUpdateGeneration += 1

  if (resultsUpdateTimeoutId !== undefined) {
    clearTimeout(resultsUpdateTimeoutId)
    resultsUpdateTimeoutId = undefined
  }
}
