import { startStudioSQLiteServer } from 'drizzle-kit/api'
import type { H3Event } from 'h3'
import * as schema from '../database/schema'
import { getLocalDatabasePath } from '../database/local-config'

const DRIZZLE_STUDIO_INTERNAL_HOST = '127.0.0.1'
const DEFAULT_DRIZZLE_STUDIO_INTERNAL_PORT = 64983
const DRIZZLE_STUDIO_STARTUP_TIMEOUT_MS = 15000
const DRIZZLE_STUDIO_STARTUP_POLL_MS = 250

declare global {
  var __stageFlowDrizzleStudioStartup__: Promise<void> | undefined
}

/** Returns the internal port used by the embedded Drizzle Studio server. */
function getDrizzleStudioInternalPort(event: H3Event) {
  const config = useRuntimeConfig(event)
  const port = Number(config.drizzleStudioInternalPort || DEFAULT_DRIZZLE_STUDIO_INTERNAL_PORT)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw createError({
      statusCode: 500,
      statusMessage: 'DRIZZLE_STUDIO_INTERNAL_PORT must be a valid TCP port',
    })
  }

  return port
}

/** Returns the base URL of the internal Drizzle Studio server. */
function getDrizzleStudioInternalUrl(event: H3Event) {
  return `http://${DRIZZLE_STUDIO_INTERNAL_HOST}:${getDrizzleStudioInternalPort(event)}`
}

/** Polls the internal Studio server until it answers its init payload. */
async function waitForDrizzleStudio(event: H3Event) {
  const deadline = Date.now() + DRIZZLE_STUDIO_STARTUP_TIMEOUT_MS
  const url = `${getDrizzleStudioInternalUrl(event)}/`
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ type: 'init' }),
      })

      if (response.ok) {
        const payload = await response.json().catch(() => null)

        if (payload && typeof payload === 'object' && 'dialect' in payload && payload.dialect === 'sqlite') {
          return
        }
      }

      lastError = new Error(`Unexpected Drizzle Studio response: ${response.status}`)
    }
    catch (error) {
      lastError = error
    }

    await new Promise(resolve => setTimeout(resolve, DRIZZLE_STUDIO_STARTUP_POLL_MS))
  }

  throw createError({
    statusCode: 502,
    statusMessage: 'Drizzle Studio failed to start',
    data: lastError instanceof Error ? { message: lastError.message } : undefined,
  })
}

/** Starts Drizzle Studio once and waits until the local server is ready. */
export async function ensureDrizzleStudioServer(event: H3Event) {
  if (!globalThis.__stageFlowDrizzleStudioStartup__) {
    globalThis.__stageFlowDrizzleStudioStartup__ = (async () => {
      await startStudioSQLiteServer(schema, {
        url: getLocalDatabasePath(),
      }, {
        host: DRIZZLE_STUDIO_INTERNAL_HOST,
        port: getDrizzleStudioInternalPort(event),
      })

      await waitForDrizzleStudio(event)
    })().catch((error) => {
      globalThis.__stageFlowDrizzleStudioStartup__ = undefined
      throw error
    })
  }

  await globalThis.__stageFlowDrizzleStudioStartup__
}

/** Returns the root RPC endpoint exposed by the local Studio server. */
export function getDrizzleStudioInternalRpcUrl(event: H3Event) {
  return `${getDrizzleStudioInternalUrl(event)}/`
}
