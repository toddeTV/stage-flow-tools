import type { Peer } from 'crossws'
import type { Results, WebSocketChannel } from '~/types'

interface PeerInfo {
  id: string
  url: string
  channel: WebSocketChannel
  userId?: string
}

interface PeerSession {
  channel: WebSocketChannel
  peer: Peer
  url: string
  userId?: string
}

interface ResultsBufferState {
  latest?: Results
  timeoutId?: ReturnType<typeof setTimeout>
}

const peerSessions = new Map<string, PeerSession>()
const resultsBuffers = new Map<WebSocketChannel, ResultsBufferState>()

function getSessions(channel?: WebSocketChannel): PeerSession[] {
  const sessions = Array.from(peerSessions.values())

  return channel
    ? sessions.filter(session => session.channel === channel)
    : sessions
}

export async function addPeer(peer: Peer, channel: WebSocketChannel, url: string, userId?: string) {
  peerSessions.set(peer.id, {
    channel,
    peer,
    url,
    userId,
  })

  await broadcastConnections()
}

export async function removePeer(peer: Peer) {
  peerSessions.delete(peer.id)

  await broadcastConnections()
}

/** Returns peer info derived from the in-memory peer map. */
export async function getPeers(channel?: WebSocketChannel): Promise<PeerInfo[]> {
  return getSessions(channel).map(session => ({
    id: session.peer.id,
    url: session.url,
    channel: session.channel,
    userId: session.userId,
  }))
}

export function broadcast(event: string, data: unknown, channel?: WebSocketChannel) {
  const message = JSON.stringify({ event, data })
  const targetSessions = getSessions(channel)

  for (const session of targetSessions) {
    try {
      session.peer.send(message)
    }
    catch (error: unknown) {
      logger_error('Broadcast error:', error)
    }
  }
}

export function sendToUser(userId: string, event: string, data: unknown, channel?: WebSocketChannel): boolean {
  const message = JSON.stringify({ event, data })
  const targetSessions = getSessions(channel)

  let delivered = false
  for (const session of targetSessions) {
    if (session.userId === userId) {
      try {
        session.peer.send(message)
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

export function scheduleResultsUpdate(data: Results, channel: WebSocketChannel) {
  const state = resultsBuffers.get(channel) || {}
  state.latest = data

  if (!state.timeoutId) {
    state.timeoutId = setTimeout(() => {
      if (state.latest) {
        broadcast('results-update', state.latest, channel)
      }

      resultsBuffers.delete(channel)
    }, 2000)
  }

  resultsBuffers.set(channel, state)
}
