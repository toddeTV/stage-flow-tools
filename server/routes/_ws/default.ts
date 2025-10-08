import { Peer, Message } from 'crossws'

export default defineWebSocketHandler({
  async open(peer) {
    logger('WebSocket connection opened')
    const { url: requestUrlString } = peer.request
    const requestUrl = new URL(requestUrlString)
    const url = requestUrl.pathname
    const userId = requestUrl.searchParams.get('userId') || undefined
    const channel = requestUrl.searchParams.get('channel') || 'default'
    await addPeer(peer, channel, url, userId)
  },

  async close(peer: Peer) {
    logger('WebSocket connection closed')
    await removePeer(peer)
  },

  error(peer: Peer, error: Error) {
    logger('WebSocket error:', error)
  },

  message(peer: Peer, message: Message) {
    // Handle ping/pong for connection keepalive
    if (message.text() === 'ping') {
      peer.send('pong')
    }
  },
})