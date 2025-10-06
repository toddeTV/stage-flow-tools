export default defineEventHandler(async (event) => {
  verifyAdmin(event)

  const peers = await getPeers()
  return peers.map((peer: { id: string, url: string }) => ({
    id: peer.id,
    url: peer.url
  }))
})