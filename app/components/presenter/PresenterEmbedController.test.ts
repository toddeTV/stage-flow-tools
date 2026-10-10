// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import PresenterEmbedController from './PresenterEmbedController.vue';

enableAutoUnmount(afterEach);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  let resolve!: (config: { allowedOrigins: string[] }) => void;
  let reject!: () => void;
  vi.stubGlobal('$fetch', vi.fn(() => new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  })));
  const reply = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  const wrapper = mount(PresenterEmbedController);
  const send = (overrides: MessageEventInit = {}) => window.dispatchEvent(new MessageEvent('message', {
    source: window.parent,
    origin: 'http://localhost:3030',
    data: { type: 'stage-flow-tools:connect', sessionId: 'session' },
    ...overrides,
  }));
  const configured = () => resolve({ allowedOrigins: [
    'http://localhost:3030',
  ] });
  return { wrapper, reply, send, configured, reject };
}

describe('presenter controller startup', () => {
  it('replays a connect received while configuration is loading', async () => {
    const s = setup();
    s.send();
    // Invalid messages must not replace the buffered handshake.
    s.send({ source: null });
    s.send({ data: { type: 'stage-flow-tools:connect', sessionId: '' } });
    expect(s.reply).not.toHaveBeenCalled();
    s.configured();
    await flushPromises();
    expect(s.reply).toHaveBeenCalledExactlyOnceWith(
      { type: 'stage-flow-tools:ready', sessionId: 'session' },
      'http://localhost:3030',
    );
  });

  it.each([
    { source: null },
    { origin: 'https://attacker.example' },
    { data: { type: 'stage-flow-tools:connect', sessionId: 'session', extra: true } },
    { data: {
      type: 'stage-flow-tools:action', sessionId: 'session',
      requestId: 1, questionKey: 'one', action: 'reveal',
    } },
  ])('rejects an early message outside the handshake contract: %j', async (overrides) => {
    const s = setup();
    s.send(overrides);
    s.configured();
    await flushPromises();
    expect(s.reply).not.toHaveBeenCalled();
  });

  it('does not replay a handshake after unmount', async () => {
    const s = setup();
    s.send();
    s.wrapper.unmount();
    s.configured();
    await flushPromises();
    expect(s.reply).not.toHaveBeenCalled();
  });

  it('reports failed configuration without replying to a buffered handshake', async () => {
    const s = setup();
    s.send();
    s.reject();
    await flushPromises();
    expect(s.reply).not.toHaveBeenCalled();
    expect(s.wrapper.get('[role="status"]').text()).toBe('Controller unavailable');
  });
});
