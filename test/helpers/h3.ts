import {
  createApp,
  toWebHandler,
} from 'h3'
import type { H3Event } from 'h3'

type RouteHandler = (event: H3Event) => unknown

export async function requestRoute(
  handler: RouteHandler,
  path: string,
  init: RequestInit = {},
) {
  const app = createApp()
  app.use(handler)

  return await toWebHandler(app)(new Request(`https://quiz.example${path}`, init))
}
