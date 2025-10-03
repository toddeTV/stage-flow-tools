const peers = new Set<any>()

export function addPeer(peer: any) {
  peers.add(peer)
}

export function removePeer(peer: any) {
  peers.delete(peer)
}

export function broadcast(event: string, data: any) {
  const message = JSON.stringify({ event, data })
  peers.forEach(peer => {
    try {
      peer.send(message)
    } catch (error) {
      console.error('Broadcast error:', error)
    }
  })
}

// Bundled results update
let resultsBuffer: any[] = []
let resultsTimeout: any | null = null

export function scheduleResultsUpdate(data: any) {
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