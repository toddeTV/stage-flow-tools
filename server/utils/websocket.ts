import type { Peer } from 'crossws'
import type { Results } from '~/types'

interface PeerInfo {
  id: string
  url: string
  userId?: string
}

const storage = useStorage('ws')
const peers = new Map<string, Peer>()

export async function addPeer(peer: Peer, url: string, userId?: string) {
  ;(peer as any).userId = userId
  peers.set(peer.id, peer)

  const storedPeers = await storage.getItem<PeerInfo[]>('peers') || []
  
  // Deduplicate by ID before appending
  const filtered = storedPeers.filter((p: PeerInfo) => p.id !== peer.id)
  const peerInfo: PeerInfo = { id: peer.id, url, userId }
  await storage.setItem('peers', [...filtered, peerInfo])
}

export async function removePeer(peer: Peer) {
  peers.delete(peer.id)
  const storedPeers = await storage.getItem<PeerInfo[]>('peers') || []
  await storage.setItem('peers', storedPeers.filter((p: PeerInfo) => p.id !== peer.id))
}

export async function getPeers() {
  return await storage.getItem<PeerInfo[]>('peers') || []
}

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data })
  for (const peer of peers.values()) {
    try {
      peer.send(message)
    }
    catch (error: unknown) {
      logger_error('Broadcast error:', error)
    }
  }
}

// Bundled results update
let resultsBuffer: Results[] = []
let resultsTimeout: ReturnType<typeof setTimeout> | null = null

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