import type { Peer } from 'crossws'
import type { Results } from '~/types'

const peers = new Set<Peer>()

export function addPeer(peer: Peer) {
  peers.add(peer)
}

export function removePeer(peer: Peer) {
  peers.delete(peer)
}

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data })
  peers.forEach((peer) => {
    try {
      peer.send(message)
    }
    catch (error: unknown) {
      console.error('Broadcast error:', error)
    }
  })
}

// Bundled results update
let resultsBuffer: Results[] = []
let resultsTimeout: NodeJS.Timeout | null = null

export function scheduleResultsUpdate(data: Results) {
  resultsBuffer.push(data)

  if (!resultsTimeout) {
    resultsTimeout = setTimeout(() => {
      if (resultsBuffer.length > 0) {
        broadcast('results-update', resultsBuffer[resultsBuffer.length - 1])
        resultsBuffer = []
      }
      resultsTimeout = null
    }, 2000) // Bundle updates every 2 seconds
  }
}