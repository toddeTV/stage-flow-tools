import { DurableObject } from 'cloudflare:workers'

interface BroadcastPayload {
  event: string
  data: unknown
  channel?: string
}

interface SendToUserPayload {
  userId: string
  event: string
  data: unknown
  channel?: string
}

interface ScheduleResultsPayload {
  event: string
  data: unknown
  channel?: string
}

/**
 * Durable Object that manages all WebSocket connections for the quiz session.
 * Handles peer tracking, message routing, broadcasting, emoji cooldowns, and results batching.
 * Uses the WebSocket Hibernation API for efficient connection management.
 */
export class QuizSession extends DurableObject {
  /** Emoji cooldown timestamps per userId. */
  private emojiCooldowns = new Map<string, number>()

  /** Buffered results update for batching. */
  private pendingResults: ScheduleResultsPayload | null = null

  /** Handles incoming HTTP requests from Nitro API routes and WebSocket upgrades. */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    // Internal HTTP API
    if (request.method === 'GET' && path === '/connections') {
      return this.handleGetConnections()
    }
    if (request.method === 'POST' && path === '/broadcast') {
      const body = await request.json() as BroadcastPayload
      this.broadcastMessage(body.event, body.data, body.channel)
      return new Response('OK', { status: 200 })
    }
    if (request.method === 'POST' && path === '/send-to-user') {
      const body = await request.json() as SendToUserPayload
      const delivered = this.sendToUser(body.userId, body.event, body.data, body.channel)
      return Response.json({ delivered }, { status: delivered ? 200 : 404 })
    }
    if (request.method === 'POST' && path === '/schedule-results') {
      const body = await request.json() as ScheduleResultsPayload
      await this.scheduleResultsUpdate(body)
      return new Response('OK', { status: 200 })
    }
    if (request.method === 'POST' && path === '/check-emoji-cooldown') {
      const body = await request.json() as { userId: string, cooldownMs: number }
      const onCooldown = this.checkEmojiCooldown(body.userId, body.cooldownMs)
      return Response.json({ onCooldown })
    }
    if (request.method === 'POST' && path === '/update-emoji-timestamp') {
      const body = await request.json() as { userId: string }
      this.updateEmojiTimestamp(body.userId)
      return new Response('OK', { status: 200 })
    }

    return new Response('Not Found', { status: 404 })
  }

  /** Upgrades an HTTP request to a WebSocket connection using the Hibernation API. */
  private handleWebSocketUpgrade(request: Request): Response {
    const url = new URL(request.url)
    const channel = url.searchParams.get('channel') || 'default'
    const userId = url.searchParams.get('userId') || ''

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    // Tag the WebSocket with channel and userId for filtering during broadcasts
    const tags = [`channel:${channel}`]
    if (userId) {
      tags.push(`user:${userId}`)
    }

    this.ctx.acceptWebSocket(server, tags)

    this.broadcastConnectionCount()

    return new Response(null, { status: 101, webSocket: client })
  }

  /** Returns connection count and peer info as JSON response. */
  private handleGetConnections(): Response {
    const sockets = this.ctx.getWebSockets()
    const peers = sockets.map((ws) => {
      return {
        id: this.getTagValue(ws, 'user') || 'unknown',
        channel: this.getTagValue(ws, 'channel') || 'default',
      }
    })
    return Response.json({ totalConnections: sockets.length, peers })
  }

  /** Called when a WebSocket message is received (Hibernation API). */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === 'string' && message === 'ping') {
      ws.send('pong')
    }
  }

  /** Called when a WebSocket connection is closed (Hibernation API). */
  async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean): Promise<void> {
    ws.close(code, reason)
    this.broadcastConnectionCount()
  }

  /** Called when a WebSocket error occurs (Hibernation API). */
  async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
    this.broadcastConnectionCount()
  }

  /** Called when a Durable Object alarm fires (used for results batching). */
  async alarm(): Promise<void> {
    if (this.pendingResults) {
      this.broadcastMessage(this.pendingResults.event, this.pendingResults.data, this.pendingResults.channel)
      this.pendingResults = null
    }
  }

  /** Broadcasts a message to all connected WebSocket clients, optionally filtered by channel. */
  private broadcastMessage(event: string, data: unknown, channel?: string): void {
    const message = JSON.stringify({ event, data })
    const sockets = channel
      ? this.ctx.getWebSockets(`channel:${channel}`)
      : this.ctx.getWebSockets()

    for (const ws of sockets) {
      try {
        ws.send(message)
      }
      catch {
        // Socket likely closed, will be cleaned up
      }
    }
  }

  /** Sends a message to a specific user by userId, optionally filtered by channel. */
  private sendToUser(userId: string, event: string, data: unknown, channel?: string): boolean {
    const message = JSON.stringify({ event, data })
    const sockets = this.ctx.getWebSockets(`user:${userId}`)

    let delivered = false
    for (const ws of sockets) {
      if (channel) {
        const wsChannel = this.getTagValue(ws, 'channel')
        if (wsChannel !== channel) continue
      }
      try {
        ws.send(message)
        delivered = true
      }
      catch {
        // Socket likely closed
      }
    }
    return delivered
  }

  /** Broadcasts the current connection count to all clients. */
  private broadcastConnectionCount(): void {
    const totalConnections = this.ctx.getWebSockets().length
    this.broadcastMessage('connections-update', { totalConnections })
  }

  /** Schedules a batched results update using the alarm API (2-second delay). */
  private async scheduleResultsUpdate(payload: ScheduleResultsPayload): Promise<void> {
    this.pendingResults = payload

    const currentAlarm = await this.ctx.storage.getAlarm()
    if (!currentAlarm) {
      await this.ctx.storage.setAlarm(Date.now() + 2000)
    }
  }

  /** Checks whether a user is on emoji cooldown. */
  private checkEmojiCooldown(userId: string, cooldownMs: number): boolean {
    this.pruneExpiredCooldowns(cooldownMs)
    const lastSubmission = this.emojiCooldowns.get(userId)
    if (lastSubmission) {
      return Date.now() - lastSubmission < cooldownMs
    }
    return false
  }

  /** Records the current timestamp for the given user in the emoji cooldown map. */
  private updateEmojiTimestamp(userId: string): void {
    this.emojiCooldowns.set(userId, Date.now())
  }

  /** Removes expired entries from the cooldown map to prevent unbounded growth. */
  private pruneExpiredCooldowns(cooldownMs: number): void {
    const now = Date.now()
    for (const [id, timestamp] of this.emojiCooldowns) {
      if (now - timestamp >= cooldownMs) {
        this.emojiCooldowns.delete(id)
      }
    }
  }

  /** Extracts a tag value from a WebSocket's tags list. */
  private getTagValue(ws: WebSocket, prefix: string): string | undefined {
    const tags = this.ctx.getTags(ws)
    for (const tag of tags) {
      if (tag.startsWith(`${prefix}:`)) {
        return tag.slice(prefix.length + 1)
      }
    }
    return undefined
  }
}
