import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Peer } from 'crossws'

import { WebSocketChannel } from '~/types'
import {
  addPeer,
  enqueueEmoji,
  getPeerCount,
  removePeer,
} from './websocket'

const runtimeConfig = {
  emojiBatchMaxSize: 1200,
  emojiBatchTickMs: 150,
  emojiQueueMaxSize: 25000,
}

const peers: Peer[] = []

vi.stubGlobal('logger_error', vi.fn())
vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)

function addPeerForChannel(channel: WebSocketChannel): Peer & { send: ReturnType<typeof vi.fn> } {
  const peer = {
    id: 'peer-' + peers.length,
    send: vi.fn(),
  } as unknown as Peer & { send: ReturnType<typeof vi.fn> }

  peers.push(peer)
  addPeer(peer, channel, '/_ws/default')
  peer.send.mockClear()

  return peer
}

function addEmojiPeer() {
  return addPeerForChannel(WebSocketChannel.EMOJIS)
}

afterEach(() => {
  for (const peer of peers.splice(0)) {
    removePeer(peer)
  }

  vi.runAllTimers()
  vi.useRealTimers()
})

describe('enqueueEmoji', () => {
  it('emits an ordered batch only after the configured tick', async () => {
    vi.useFakeTimers()
    const peer = addEmojiPeer()

    enqueueEmoji({ emoji: '🔥', id: 'first' })
    enqueueEmoji({ emoji: '👏', id: 'second' })

    vi.advanceTimersByTime(149)
    expect(peer.send).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(peer.send).toHaveBeenCalledTimes(1)
    expect(JSON.parse(peer.send.mock.calls[0]![0])).toEqual({
      event: 'emojis',
      data: [
        { emoji: '🔥', id: 'first' },
        { emoji: '👏', id: 'second' },
      ],
    })
  })

  it('continues on later ticks when a batch reaches the configured maximum', async () => {
    vi.useFakeTimers()
    const peer = addEmojiPeer()

    for (let index = 0; index < runtimeConfig.emojiBatchMaxSize + 1; index++) {
      enqueueEmoji({ emoji: '🔥', id: String(index) })
    }

    vi.advanceTimersByTime(150)
    expect(JSON.parse(peer.send.mock.calls[0]![0]).data).toHaveLength(runtimeConfig.emojiBatchMaxSize)

    vi.advanceTimersByTime(149)
    expect(peer.send).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(JSON.parse(peer.send.mock.calls[1]![0])).toEqual({
      event: 'emojis',
      data: [
        { emoji: '🔥', id: '1200' },
      ],
    })
  })

  it('discards new reactions when the pending queue is full', () => {
    vi.useFakeTimers()

    for (let index = 0; index < runtimeConfig.emojiQueueMaxSize; index++) {
      expect(enqueueEmoji({ emoji: '🔥', id: String(index) })).toBe(true)
    }

    expect(enqueueEmoji({ emoji: '👏', id: 'discarded' })).toBe(false)
  })
})

describe('peer tracking', () => {
  it('counts channels without broadcasting connection changes', () => {
    vi.useFakeTimers()
    const defaultPeer = addPeerForChannel(WebSocketChannel.DEFAULT)
    const resultsPeer = addPeerForChannel(WebSocketChannel.RESULTS)
    const emojiPeer = addPeerForChannel(WebSocketChannel.EMOJIS)

    expect(defaultPeer.send).not.toHaveBeenCalled()
    expect(resultsPeer.send).not.toHaveBeenCalled()
    expect(emojiPeer.send).not.toHaveBeenCalled()
    expect(getPeerCount()).toBe(3)
    expect(getPeerCount(WebSocketChannel.DEFAULT)).toBe(1)

    removePeer(defaultPeer)
    expect(getPeerCount(WebSocketChannel.DEFAULT)).toBe(0)
    expect(resultsPeer.send).not.toHaveBeenCalled()
    expect(emojiPeer.send).not.toHaveBeenCalled()
  })
})
