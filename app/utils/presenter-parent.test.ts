import { describe, expect, it, vi } from 'vite-plus/test'
import { safeParse } from 'valibot'
import { PresenterParentCommandSchema, PresenterParentOriginsSchema } from '#shared/utils/validation'
import { createPresenterParentBridge } from './presenter-parent'

function setup() {
  const parent = {} as Window
  const select = vi.fn(async () => true)
  const reply = vi.fn()
  const bridge = createPresenterParentBridge({ parent, allowedOrigins: [
    'https://slides.example',
  ], select, reply })
  const send = (data: unknown, origin = 'https://slides.example', source = parent) => {
    bridge.handleMessage({ data, origin, source })
  }
  return { parent, select, reply, bridge, send }
}
const connect = { type: 'stage-flow-tools:connect', sessionId: 'session' }
const context = {
  type: 'stage-flow-tools:context', sessionId: 'session', requestId: 1,
  selection: { questionKey: 'one', questionCount: 1, mode: 'quiz' },
}

describe('Presenter parent boundary', () => {
  it('rejects untrusted sources, origins, sessions, duplicate requests and old actions', () => {
    const { send, select, reply } = setup()
    send(connect, 'https://other.example')
    send(connect, undefined, {} as Window)
    send(context)
    expect(select).not.toHaveBeenCalled()
    expect(reply).not.toHaveBeenCalled()
    send(connect)
    send({ ...context, sessionId: 'old' })
    send({ ...context, selection: { ...context.selection, readOnly: false } })
    send({ type: 'stage-flow-tools:action', sessionId: 'session', requestId: 1, questionKey: 'one', action: 'reveal' })
    expect(select).not.toHaveBeenCalled()
    send(context)
    send(context)
    expect(select).toHaveBeenCalledOnce()
  })
  it('acknowledges only the newest confirmed context and reports failures', async () => {
    const { send, select, reply } = setup()
    let complete!: (value: boolean) => void
    select.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    send(connect)
    send(context)
    send({ ...context, requestId: 2, selection: null })
    await Promise.resolve()
    expect(reply).toHaveBeenLastCalledWith({
      type: 'stage-flow-tools:ack', sessionId: 'session', requestId: 2, questionKey: null, status: 'closed',
    }, 'https://slides.example')
    const count = reply.mock.calls.length
    complete(true)
    await Promise.resolve()
    expect(reply).toHaveBeenCalledTimes(count)
    select.mockResolvedValueOnce(false)
    send({ ...context, requestId: 3 })
    await Promise.resolve()
    expect(reply).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'error', requestId: 3 }), 'https://slides.example',
    )
  })
  it('does not reply after teardown', async () => {
    const { bridge, send, reply } = setup()
    send(connect)
    send(context)
    bridge.stop()
    await Promise.resolve()
    send(connect)
    expect(reply).toHaveBeenCalledTimes(1)
  })
  it.each([
    '*',
    'https://slides.example/path',
    'https://user:pass@slides.example',
    'null',
    'https://slides.example?x',
  ])('rejects non-exact parent origins: %s', value => {
    expect(safeParse(PresenterParentOriginsSchema, value).success).toBe(false)
  })
  it.each([
    0,
    -1,
    1.5,
    Number.POSITIVE_INFINITY,
  ])('rejects invalid counts at the message boundary: %s', questionCount => {
    expect(safeParse(PresenterParentCommandSchema, {
      ...context, selection: { ...context.selection, questionCount },
    }).success).toBe(false)
  })
})
