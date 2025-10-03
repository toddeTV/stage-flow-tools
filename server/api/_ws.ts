import { addPeer, removePeer } from '../utils/websocket'

export default defineWebSocketHandler({
  open(peer) {
    console.log('WebSocket connection opened')
    addPeer(peer)
  },
  
  close(peer) {
    console.log('WebSocket connection closed')
    removePeer(peer)
  },
  
  error(peer, error) {
    console.error('WebSocket error:', error)
  },
  
  message(peer, message) {
    // Handle ping/pong for connection keepalive
    if (message.text() === 'ping') {
      peer.send('pong')
    }
  }
})