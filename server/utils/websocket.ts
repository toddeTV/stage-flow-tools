import type { Peer } from 'crossws'
import { WebSocketChannel } from '~/types'
import type { EmojiReaction } from '~/types'

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

const peerSessions = new Map<string, PeerSession>()
const emojiBuffer: EmojiReaction[] = []
let emojiTimeoutId: ReturnType<typeof setTimeout> | undefined

function getSessions(channel?: WebSocketChannel): PeerSession[] {
  const sessions = Array.from(peerSessions.values())

  return channel
    ? sessions.filter(session => session.channel === channel)
    : sessions
}

export function addPeer(peer: Peer, channel: WebSocketChannel, url: string, userId?: string) {
  peerSessions.set(peer.id, {
    channel,
    peer,
    url,
    userId,
  })
}

export function removePeer(peer: Peer) {
  peerSessions.delete(peer.id)
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

/** Counts current peer sessions, optionally restricted to one channel. */
export function getPeerCount(channel?: WebSocketChannel): number {
  if (!channel) {
    return peerSessions.size
  }

  let count = 0

  for (const session of peerSessions.values()) {
    if (session.channel === channel) {
      count += 1
    }
  }

  return count
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

function scheduleEmojiBatch(): void {
  if (emojiTimeoutId !== undefined) {
    return
  }

  const config = useRuntimeConfig()

  emojiTimeoutId = setTimeout(() => {
    emojiTimeoutId = undefined

    const emojis = emojiBuffer.splice(0, config.emojiBatchMaxSize)
    if (emojis.length > 0) {
      broadcast('emojis', emojis, WebSocketChannel.EMOJIS)
    }

    if (emojiBuffer.length > 0) {
      scheduleEmojiBatch()
    }
  }, config.emojiBatchTickMs)
}

/** Adds an emoji to the next server-side batch when queue capacity remains. */
export function enqueueEmoji(reaction: EmojiReaction): boolean {
  const config = useRuntimeConfig()

  if (emojiBuffer.length >= config.emojiQueueMaxSize) {
    return false
  }

  emojiBuffer.push(reaction)
  scheduleEmojiBatch()

  return true
}
