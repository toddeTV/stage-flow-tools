import type { Peer } from 'crossws'
import type { Results } from '~/types'

interface PeerInfo {
  id: string
  url: string
  channel: string
  userId?: string
}

const storage = useStorage('ws')
const peers = new Map<string, Map<string, Peer>>() // Channel -> Peer ID -> Peer

function getChannelPeers(channel: string): Map<string, Peer> {
  if (!peers.has(channel)) {
    peers.set(channel, new Map<string, Peer>())
  }
  return peers.get(channel)!
}

export async function addPeer(peer: Peer, channel: string, url: string, userId?: string) {
  ;(peer as any).userId = userId
  ;(peer as any).channel = channel
  getChannelPeers(channel).set(peer.id, peer)

  const storedPeers = await storage.getItem<PeerInfo[]>('peers') || []
  
  const filtered = storedPeers.filter((p: PeerInfo) => p.id !== peer.id)
  const peerInfo: PeerInfo = { id: peer.id, url, channel, userId }
  await storage.setItem('peers', [...filtered, peerInfo])
  await broadcastConnections()
}

export async function removePeer(peer: Peer) {
  const channel = (peer as any).channel
  if (channel) {
    getChannelPeers(channel).delete(peer.id)
  }
  
  const storedPeers = await storage.getItem<PeerInfo[]>('peers') || []
  await storage.setItem('peers', storedPeers.filter((p: PeerInfo) => p.id !== peer.id))
  await broadcastConnections()
}

export async function getPeers(channel?: string) {
  const allPeers = await storage.getItem<PeerInfo[]>('peers') || []
  if (channel) {
    return allPeers.filter(p => p.channel === channel)
  }
  return allPeers
}

export function broadcast(event: string, data: unknown, channel?: string) {
  const message = JSON.stringify({ event, data })
  const targetPeers = channel ? getChannelPeers(channel).values() : Array.from(peers.values()).flatMap(map => Array.from(map.values()))

  for (const peer of targetPeers) {
    try {
      peer.send(message)
    }
    catch (error: unknown) {
      logger_error('Broadcast error:', error)
    }
  }
}

export async function broadcastConnections() {
  const allPeers = await getPeers()
  broadcast('connections-update', { totalConnections: allPeers.length })
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