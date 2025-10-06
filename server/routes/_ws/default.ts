import { Peer, Message } from 'crossws'

export default defineWebSocketHandler({
  open(peer: Peer) {
    console.log('WebSocket connection opened')
    const url = (peer as any).h3Event?.path || '/'
    const userId = getQuery((peer as any).h3Event)?.userId as string | undefined
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
  }
})