import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Peer } from 'crossws'

import {
  WebSocketChannel,
  type Results,
} from '~/types'
import {
  addPeer,
  broadcast,
  clearScheduledResultsUpdate,
  enqueueEmoji,
  removePeer,
  scheduleResultsUpdate,
} from './websocket'

const runtimeConfig = {
  emojiBatchMaxSize: 1200,
  emojiBatchTickMs: 150,
  emojiQueueMaxSize: 25000,
}

const peers: Peer[] = []

vi.stubGlobal('logger_error', vi.fn())
vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)

async function addPeerForChannel(channel: WebSocketChannel): Promise<Peer & { send: ReturnType<typeof vi.fn> }> {
  const peer = {
    id: 'peer-' + peers.length,
    send: vi.fn(),
  } as unknown as Peer & { send: ReturnType<typeof vi.fn> }

  peers.push(peer)
  await addPeer(peer, channel, '/_ws/default')
  peer.send.mockClear()

  return peer
}

async function addEmojiPeer() {
  return addPeerForChannel(WebSocketChannel.EMOJIS)
}

afterEach(async () => {
  for (const peer of peers.splice(0)) {
    await removePeer(peer)
  }

  vi.runAllTimers()
  vi.useRealTimers()
})

describe('enqueueEmoji', () => {
  it('emits an ordered batch only after the configured tick', async () => {
    vi.useFakeTimers()
    const peer = await addEmojiPeer()

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
    const peer = await addEmojiPeer()

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

describe('scheduled results updates', () => {
  it('does not send stale results after the channel is cleared', async () => {
    vi.useFakeTimers()
    const peer = await addPeerForChannel(WebSocketChannel.RESULTS)

    scheduleResultsUpdate({} as Results, WebSocketChannel.RESULTS)
    clearScheduledResultsUpdate(WebSocketChannel.RESULTS)
    broadcast('results-update', null, WebSocketChannel.RESULTS)
    vi.advanceTimersByTime(2000)

    expect(peer.send).toHaveBeenCalledTimes(1)
    expect(JSON.parse(peer.send.mock.calls[0]![0])).toEqual({
      data: null,
      event: 'results-update',
    })
  })
})
