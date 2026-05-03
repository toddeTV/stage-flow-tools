import { verifyAdmin } from '../../../../utils/auth'

const DRIZZLE_STUDIO_APP_ORIGIN = 'https://local.drizzle.studio'
const DRIZZLE_STUDIO_ASSET_FETCH_TIMEOUT_MS = 8000
const FORWARDED_HEADERS = [
  'cache-control',
  'content-type',
  'etag',
  'last-modified',
]

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const assetPath = event.context.params?.asset

  if (!assetPath) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Drizzle Studio asset not found',
    })
  }

  const requestUrl = getRequestURL(event)
  const upstreamUrl = `${DRIZZLE_STUDIO_APP_ORIGIN}/${assetPath}${requestUrl.search}`
  let response: Response

  try {
    response = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(DRIZZLE_STUDIO_ASSET_FETCH_TIMEOUT_MS),
    })
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'

    throw createError({
      statusCode: isAbort ? 504 : 502,
      statusMessage: isAbort
        ? `Timed out loading Drizzle Studio asset: ${assetPath}`
        : 'Failed to reach Drizzle Studio asset upstream',
      data: error instanceof Error ? { message: error.message } : undefined,
    })
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `Failed to load Drizzle Studio asset: ${assetPath}`,
    })
  }

  setResponseStatus(event, response.status, response.statusText)

  for (const header of FORWARDED_HEADERS) {
    const value = response.headers.get(header)

    if (value) {
      setHeader(event, header, value)
    }
  }

  return new Uint8Array(await response.arrayBuffer())
})
