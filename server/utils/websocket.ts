import type { Peer } from 'crossws'
import type { Results, WebSocketChannel } from '~/types'

interface PeerInfo {
  id: string
  url: string
  channel: WebSocketChannel
  userId?: string
}

const peers = new Map<WebSocketChannel, Map<string, Peer>>() // Channel -> Peer ID -> Peer

export function getChannelPeers(channel: WebSocketChannel): Map<string, Peer> {
  if (!peers.has(channel)) {
    peers.set(channel, new Map<string, Peer>())
  }
  return peers.get(channel)!
}

export async function addPeer(peer: Peer, channel: WebSocketChannel, url: string, userId?: string) {
  ;(peer as unknown as Record<string, unknown>).userId = userId
  ;(peer as unknown as Record<string, unknown>).channel = channel
  ;(peer as unknown as Record<string, unknown>).url = url
  getChannelPeers(channel).set(peer.id, peer)
  await broadcastConnections()
}

export async function removePeer(peer: Peer) {
  const channel = (peer as unknown as Record<string, unknown>).channel as WebSocketChannel | undefined
  if (channel) {
    getChannelPeers(channel).delete(peer.id)
    if (getChannelPeers(channel).size === 0) {
      peers.delete(channel)
    }
  }
  await broadcastConnections()
}

/** Returns peer info derived from the in-memory peer map. */
export async function getPeers(channel?: WebSocketChannel): Promise<PeerInfo[]> {
  const result: PeerInfo[] = []
  const targetEntries = channel
    ? [
      [
        channel,
        getChannelPeers(channel),
      ] as const,
    ]
    : Array.from(peers.entries())

  for (const [
    ch,
    peerMap,
  ] of targetEntries) {
    for (const [
      , peer,
    ] of peerMap) {
      const peerData = peer as unknown as Record<string, unknown>
      result.push({
        id: peer.id,
        url: (peerData.url as string) || '',
        channel: ch,
        userId: peerData.userId as string | undefined,
      })
    }
  }
  return result
}

export function broadcast(event: string, data: unknown, channel?: WebSocketChannel) {
  const message = JSON.stringify({ event, data })
  const targetPeers = channel
    ? getChannelPeers(channel).values()
    : Array.from(peers.values()).flatMap(
      map => Array.from(map.values()),
    )

  for (const peer of targetPeers) {
    try {
      peer.send(message)
    }
    catch (error: unknown) {
      logger_error('Broadcast error:', error)
    }
  }
}

export function sendToUser(userId: string, event: string, data: unknown, channel?: WebSocketChannel): boolean {
  const message = JSON.stringify({ event, data })
  const targetPeers = channel
    ? Array.from(getChannelPeers(channel).values())
    : Array.from(peers.values()).flatMap(map => Array.from(map.values()))

  let delivered = false
  for (const peer of targetPeers) {
    if ((peer as unknown as Record<string, unknown>).userId === userId) {
      try {
        peer.send(message)
        delivered = true
      }
      catch (error: unknown) {
        logger_error(`Failed to send message to user ${userId}:`, error)
      }
    }
  }
  return delivered
}

export async function broadcastConnections() {
  const allPeers = await getPeers()
  broadcast('connections-update', { totalConnections: allPeers.length })
}

// Bundled results update
let resultsBuffer: Results[] = []
let resultsTimeout: ReturnType<typeof setTimeout> | null = null

export function scheduleResultsUpdate(data: Results, channel: WebSocketChannel) {
  resultsBuffer.push(data)

  if (!resultsTimeout) {
    resultsTimeout = setTimeout(() => {
      if (resultsBuffer.length > 0) {
        broadcast('results-update', resultsBuffer[resultsBuffer.length - 1], channel)
        resultsBuffer = []
      }
      resultsTimeout = null
    }, 2000) // Bundle updates every 2 seconds
  }
}
