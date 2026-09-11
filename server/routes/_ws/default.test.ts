import type { Peer } from 'crossws'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import { WebSocketChannel } from '~/types'
import { throwApiError } from '../../utils/api-errors'
import {
  isSameOriginWebSocketRequest,
  verifyAdminWebSocket,
} from '../../utils/auth'

const addPeer = vi.fn()

type WebSocketRoute = {
  open(peer: Peer): Promise<void>
}

function createPeer(url: string, headers: HeadersInit = {}) {
  return {
    close: vi.fn(),
    id: 'peer-id',
    request: new Request(url, { headers }),
    send: vi.fn(),
  } as unknown as Peer & {
    close: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
  }
}

function configureRouteRuntime() {
  vi.stubGlobal('addPeer', addPeer)
  vi.stubGlobal('defineWebSocketHandler', <T>(handler: T) => handler)
  vi.stubGlobal('isSameOriginWebSocketRequest', isSameOriginWebSocketRequest)
  vi.stubGlobal('logger', vi.fn())
  vi.stubGlobal('throwApiError', throwApiError)
  vi.stubGlobal('useRuntimeConfig', () => ({
    adminToken: 'results-admin-token',
    jwtSecret: 'unused-for-static-token',
  }))
  vi.stubGlobal('verifyAdminWebSocket', verifyAdminWebSocket)
}

beforeEach(() => {
  configureRouteRuntime()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('results WebSocket route', () => {
  it('rejects cross-origin and unauthenticated results channels before registering peers', async () => {
    const { default: route } = await import('./default')
    const webSocketRoute = route as unknown as WebSocketRoute
    const crossOriginPeer = createPeer('https://quiz.example/_ws?channel=results', {
      origin: 'https://untrusted.example',
    })
    const unauthenticatedPeer = createPeer('https://quiz.example/_ws?channel=results', {
      origin: 'https://quiz.example',
    })

    await webSocketRoute.open(crossOriginPeer)
    await webSocketRoute.open(unauthenticatedPeer)

    expect(crossOriginPeer.close).toHaveBeenCalledWith(1008, 'auth.origin_invalid')
    expect(unauthenticatedPeer.close).toHaveBeenCalledWith(1008, 'auth.token_required')
    expect(addPeer).not.toHaveBeenCalled()
  })

  it('registers authenticated results peers and unauthenticated public peers in their requested channels', async () => {
    const { default: route } = await import('./default')
    const webSocketRoute = route as unknown as WebSocketRoute
    const resultsPeer = createPeer('https://quiz.example/_ws?channel=results&userId=presenter-id', {
      cookie: 'admin_token=results-admin-token',
      origin: 'https://quiz.example',
    })
    const publicPeer = createPeer('https://quiz.example/_ws?channel=default&userId=participant-id')

    await webSocketRoute.open(resultsPeer)
    await webSocketRoute.open(publicPeer)

    expect(resultsPeer.close).not.toHaveBeenCalled()
    expect(publicPeer.close).not.toHaveBeenCalled()
    expect(addPeer).toHaveBeenNthCalledWith(
      1,
      resultsPeer,
      WebSocketChannel.RESULTS,
      '/_ws',
      'presenter-id',
    )
    expect(addPeer).toHaveBeenNthCalledWith(
      2,
      publicPeer,
      WebSocketChannel.DEFAULT,
      '/_ws',
      'participant-id',
    )
  })
})
