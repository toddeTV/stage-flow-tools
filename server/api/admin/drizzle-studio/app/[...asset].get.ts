import { verifyAdmin } from '../../../../utils/auth'

const DRIZZLE_STUDIO_APP_ORIGIN = 'https://local.drizzle.studio'
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
  const response = await fetch(upstreamUrl)

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
