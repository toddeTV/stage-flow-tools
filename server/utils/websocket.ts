import type { H3Event } from 'h3'
import type { Results, WebSocketChannel } from '~/types'

interface ConnectionsResponse {
  totalConnections: number
  peers: Array<{ id: string, channel: string }>
}

/**
 * Returns a Durable Object stub for the singleton QuizSession instance.
 * Uses a fixed ID so all API routes communicate with the same DO.
 */
export function getQuizSessionStub(event: H3Event) {
  const { cloudflare } = event.context
  if (!cloudflare?.env?.QUIZ_SESSION) {
    throw createError({
      statusCode: 500,
      statusMessage: 'QUIZ_SESSION Durable Object binding not available',
    })
  }
  const id = cloudflare.env.QUIZ_SESSION.idFromName('global')
  return cloudflare.env.QUIZ_SESSION.get(id)
}

/** Broadcasts an event to all connected WebSocket clients via the Durable Object. */
export async function broadcast(event: H3Event, eventName: string, data: unknown, channel?: WebSocketChannel) {
  const stub = getQuizSessionStub(event)
  await stub.fetch(new Request('https://do/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: eventName, data, channel }),
  }))
}

/** Sends an event to a specific user by userId via the Durable Object. */
export async function sendToUser(
  event: H3Event,
  userId: string,
  eventName: string,
  data: unknown,
  channel?: WebSocketChannel,
): Promise<boolean> {
  const stub = getQuizSessionStub(event)
  const response = await stub.fetch(new Request('https://do/send-to-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, event: eventName, data, channel }),
  }))
  const result = await response.json() as { delivered: boolean }
  return result.delivered
}

/** Returns connection info from the Durable Object. */
export async function getConnections(event: H3Event): Promise<ConnectionsResponse> {
  const stub = getQuizSessionStub(event)
  const response = await stub.fetch(new Request('https://do/connections'))
  return await response.json() as ConnectionsResponse
}

/** Schedules a batched results update via the Durable Object alarm. */
export async function scheduleResultsUpdate(event: H3Event, data: Results, channel: WebSocketChannel) {
  const stub = getQuizSessionStub(event)
  await stub.fetch(new Request('https://do/schedule-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'results-update', data, channel }),
  }))
}

/** Checks whether a user is on emoji cooldown via the Durable Object. */
export async function checkEmojiCooldown(event: H3Event, userId: string, cooldownMs: number): Promise<boolean> {
  const stub = getQuizSessionStub(event)
  const response = await stub.fetch(new Request('https://do/check-emoji-cooldown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, cooldownMs }),
  }))
  const result = await response.json() as { onCooldown: boolean }
  return result.onCooldown
}

/** Records the current emoji timestamp for a user via the Durable Object. */
export async function updateEmojiTimestamp(event: H3Event, userId: string) {
  const stub = getQuizSessionStub(event)
  await stub.fetch(new Request('https://do/update-emoji-timestamp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }))
}
