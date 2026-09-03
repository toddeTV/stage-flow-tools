import type { Peer, Message } from 'crossws'
import { safeParse } from 'valibot'
import type { WebSocketChannel } from '~/types'
import {
  WebSocketMessageSchema,
  WebSocketQuerySchema,
} from '#shared/utils/validation'

export default defineWebSocketHandler({
  async open(peer) {
    logger('WebSocket connection opened')
    const { url: requestUrlString } = peer.request
    const requestUrl = new URL(requestUrlString)
    const url = requestUrl.pathname
    const query = safeParse(WebSocketQuerySchema, {
      channel: requestUrl.searchParams.get('channel') || undefined,
      userId: requestUrl.searchParams.get('userId') || undefined,
    })

    if (!query.success) {
      peer.close(1008, 'validation.invalid_websocket_query')
      return
    }

    await addPeer(peer, query.output.channel as WebSocketChannel, url, query.output.userId)
  },

  async close(peer: Peer) {
    logger('WebSocket connection closed')
    await removePeer(peer)
  },

  error(peer: Peer, error: Error) {
    logger('WebSocket error:', error)
  },

  message(peer: Peer, message: Message) {
    const parsedMessage = safeParse(WebSocketMessageSchema, message.text())

    if (parsedMessage.success) {
      peer.send('pong')
    }
  },
})
