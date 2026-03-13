/**
 * WebSocket upgrade handler.
 * Forwards the WebSocket upgrade request to the QuizSession Durable Object.
 */
export default defineEventHandler(async (event) => {
  const stub = getQuizSessionStub(event)

  // Forward the original request to the Durable Object for WebSocket upgrade
  const url = getRequestURL(event)
  const headers = getRequestHeaders(event)

  const doUrl = new URL(url.pathname + url.search, 'https://do')
  const response = await stub.fetch(doUrl.toString(), {
    headers: {
      Upgrade: headers.upgrade || 'websocket',
      ...Object.fromEntries(
        Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'host'),
      ),
    },
  })

  return response
})
