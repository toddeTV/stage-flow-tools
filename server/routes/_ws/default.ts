import { Peer, Message } from 'crossws'

export default defineWebSocketHandler({
  open(peer) {
    console.log('WebSocket connection opened')
    const requestUrl = new URL(peer.request.url)
    const url = requestUrl.pathname
    const userId = requestUrl.searchParams.get('userId') || undefined
    addPeer(peer, url, userId)
  },

  close(peer: Peer) {
    console.log('WebSocket connection closed')
    removePeer(peer)
  },

  error(peer: Peer, error: Error) {
    console.error('WebSocket error:', error)
  },

  message(peer: Peer, message: Message) {
    // Handle ping/pong for connection keepalive
    if (message.text() === 'ping') {
      peer.send('pong')
    }
  },
})