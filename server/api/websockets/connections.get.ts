export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const { peers } = await getConnections(event)
  return peers.map((peer: { id: string, channel: string }) => ({
    id: peer.id,
    channel: peer.channel,
  }))
})
