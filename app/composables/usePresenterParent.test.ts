// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import type { createPresenterQuizController } from './presenter/controller'
import { usePresenterParent } from './usePresenterParent'

function setup(enabled = true) {
  let finish!: (value: { allowedOrigins: string[] }) => void
  const fetch = vi.fn(() => new Promise<{ allowedOrigins: string[] }>((resolve) => { finish = resolve }))
  vi.stubGlobal('$fetch', fetch)
  const select = vi.fn(async () => true)
  const errorKind = ref(null)
  const controller = { select, errorKind } as unknown as ReturnType<typeof createPresenterQuizController>
  const reply = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
  const wrapper = mount(defineComponent({
    setup() {
      usePresenterParent(controller, enabled)
      return () => null
    },
  }))
  const send = (data: unknown, origin = 'https://slides.example') => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source: window.parent }))
  }
  return { wrapper, select, fetch, reply, errorKind, send, finish: () => finish({ allowedOrigins: [
    'https://slides.example',
  ] }) }
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Presenter parent lifecycle', () => {
  it('buffers the startup handshake until authenticated origin configuration is available', async () => {
    const { wrapper, send, finish, reply, select } = setup()
    send({ type: 'stage-flow-tools:connect', sessionId: 's' })
    expect(reply).not.toHaveBeenCalled()
    finish()
    await flushPromises()
    expect(reply).toHaveBeenCalledWith({ type: 'stage-flow-tools:ready', sessionId: 's' }, 'https://slides.example')
    send({
      type: 'stage-flow-tools:context', sessionId: 's', requestId: 1,
      selection: { questionKey: 'one', questionCount: 1, mode: 'status' },
    })
    await flushPromises()
    expect(select).toHaveBeenCalledWith({ questionKey: 'one', questionCount: 1, mode: 'status' })
    wrapper.unmount()
  })
  it('revalidates a buffered untrusted origin and removes pending startup work on teardown', async () => {
    const { wrapper, send, finish, reply } = setup()
    send({ type: 'stage-flow-tools:connect', sessionId: 's' }, 'https://other.example')
    finish()
    await flushPromises()
    expect(reply).not.toHaveBeenCalled()
    wrapper.unmount()
    send({ type: 'stage-flow-tools:connect', sessionId: 's' })
    expect(reply).not.toHaveBeenCalled()
  })
  it('does not load parent permissions for ordinary Presenter URLs', () => {
    const { wrapper, fetch } = setup(false)
    expect(fetch).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
