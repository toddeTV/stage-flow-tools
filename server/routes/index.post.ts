import { verifyAdmin } from '../utils/auth'
import {
  ensureDrizzleStudioServer,
  getDrizzleStudioInternalRpcUrl,
} from '../utils/drizzle-studio'

const DRIZZLE_STUDIO_RPC_TIMEOUT_MS = 10000

const FORWARDED_HEADERS = [
  'cache-control',
  'content-type',
]

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)
  await ensureDrizzleStudioServer(event)

  const rawBody = await readRawBody(event, false)
  const requestBody = typeof rawBody === 'string'
    ? rawBody
    : rawBody
      ? rawBody.toString('utf8')
      : undefined

  let response: Response

  try {
    response = await fetch(getDrizzleStudioInternalRpcUrl(event), {
      method: 'POST',
      signal: AbortSignal.timeout(DRIZZLE_STUDIO_RPC_TIMEOUT_MS),
      headers: {
        'accept': getHeader(event, 'accept') || 'application/json',
        'content-type': getHeader(event, 'content-type') || 'application/json',
      },
      body: requestBody,
    })
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'

    throw createError({
      statusCode: isAbort ? 504 : 502,
      statusMessage: isAbort
        ? 'Timed out reaching the Drizzle Studio proxy'
        : 'Failed to reach the Drizzle Studio proxy',
      data: error instanceof Error ? { message: error.message } : undefined,
    })
  }

  setResponseStatus(event, response.status, response.statusText)

  for (const header of FORWARDED_HEADERS) {
    const value = response.headers.get(header)

    if (value) {
      setHeader(event, header, value)
    }
  }

  return await response.text()
})
