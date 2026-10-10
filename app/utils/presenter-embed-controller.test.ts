import { describe, expect, it, vi } from 'vite-plus/test';
import type { Results } from '~/types';
import { createPresenterEmbedController } from './presenter-embed-controller';

function setup() {
  const parent = {} as Window;
  const states = new Map(
    [
      'one',
      'two',
    ].map((key) => [
      key,
      {
        question: {
          id: `${key}-id`,
          key,
          alreadyPublished: false,
          is_active: false,
          is_disabled: false,
          is_locked: false,
        },
        results: { Finished: { count: 7 } },
        totalVotes: 10,
        totalConnections: 12,
      } as unknown as Results,
    ]),
  );
  const api = {
    getState: vi.fn(async (key: string) => states.get(key)!),
    publish: vi.fn(async (key: string) => {
      for (const state of states.values())
        state.question.is_active = state.question.key === key;
      states.get(key)!.question.alreadyPublished = true;
    }),
    setLocked: vi.fn(async (id: string, locked: boolean) => {
      [
        ...states.values(),
      ].find(
        (state) => state.question.id === id,
      )!.question.is_locked = locked;
    }),
    close: vi.fn(async (key: string) => {
      states.get(key)!.question.is_active = false;
    }),
  };
  const reply = vi.fn();
  const controller = createPresenterEmbedController({
    allowedOrigins: [
      'http://localhost:3030',
    ],
    parent,
    api,
    reply,
  });
  const send = (
    data: unknown,
    origin = 'http://localhost:3030',
    source = parent,
  ) => controller.handleMessage({ data, origin, source });
  const connect = () =>
    send({ type: 'stage-flow-tools:connect', sessionId: 'session' });
  const context = (requestId: number, key: string | null) =>
    send({
      type: 'stage-flow-tools:context',
      sessionId: 'session',
      requestId,
      selection: key ? { questionKey: key, mode: 'quiz' } : null,
    });
  return { api, states, reply, controller, send, connect, context };
}

describe('scoped presenter bridge', () => {
  it('requires trusted parent, handshake, matching session, strict payload and increasing request', async () => {
    const s = setup();
    s.context(1, 'one');
    s.send(
      { type: 'stage-flow-tools:connect', sessionId: 'session' },
      'https://attacker.example',
    );
    s.send(
      { type: 'stage-flow-tools:connect', sessionId: 'session' },
      undefined,
      {} as Window,
    );
    expect(s.reply).not.toHaveBeenCalled();
    s.connect();
    s.send({
      type: 'stage-flow-tools:context',
      sessionId: 'old',
      requestId: 1,
      selection: { questionKey: 'one', mode: 'quiz' },
    });
    s.send({
      type: 'stage-flow-tools:context',
      sessionId: 'session',
      requestId: 1,
      selection: { questionKey: 'one', mode: 'quiz' },
      extra: true,
    });
    expect(s.api.publish).not.toHaveBeenCalled();
    s.context(1, 'one');
    await vi.waitFor(() =>
      expect(s.api.setLocked).toHaveBeenCalledWith('one-id', false),
    );
    s.context(1, 'two');
    expect(s.api.publish).toHaveBeenCalledExactlyOnceWith('one');
    expect(s.reply).toHaveBeenCalledWith(
      { type: 'stage-flow-tools:ready', sessionId: 'session' },
      'http://localhost:3030',
    );
  });

  it('retains closed status counts and only explicit reopening publishes again', async () => {
    const s = setup();
    s.states.get('one')!.question.alreadyPublished = true;
    s.states.get('one')!.question.is_locked = true;
    s.connect();
    s.context(1, 'one');
    await vi.waitFor(() =>
      expect(s.reply).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 1, status: 'ready' }),
        expect.any(String),
      ),
    );
    expect(s.api.publish).not.toHaveBeenCalled();
    s.send({
      type: 'stage-flow-tools:action',
      sessionId: 'session',
      requestId: 2,
      questionKey: 'one',
      action: 'reopen',
    });
    await vi.waitFor(() =>
      expect(s.api.setLocked).toHaveBeenCalledWith('one-id', false),
    );
    expect(s.states.get('one')!.results.Finished!.count).toBe(7);
    s.context(3, null);
    await vi.waitFor(() => expect(s.api.close).toHaveBeenCalledWith('one'));
    expect(s.states.get('one')!.results.Finished!.count).toBe(7);
  });

  it('skips outdated activation while an asynchronous read is pending', async () => {
    const s = setup();
    let resolve!: (state: Results) => void;
    s.api.getState.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    s.connect();
    s.context(1, 'one');
    s.context(2, 'two');
    resolve(s.states.get('one')!);
    await vi.waitFor(() =>
      expect(s.api.publish).toHaveBeenCalledExactlyOnceWith('two'),
    );
  });

  it('closes an activation already in flight before activating newest context', async () => {
    const s = setup();
    let resolve!: () => void;
    s.api.publish.mockImplementationOnce(
      async () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    s.connect();
    s.context(1, 'one');
    await vi.waitFor(() => expect(s.api.publish).toHaveBeenCalledWith('one'));
    s.context(2, 'two');
    resolve();
    await vi.waitFor(() => expect(s.api.publish).toHaveBeenCalledWith('two'));
    expect(s.api.close).toHaveBeenCalledWith('one');
    expect(s.api.close.mock.invocationCallOrder[0]).toBeLessThan(
      s.api.publish.mock.invocationCallOrder[1]!,
    );
    expect(s.api.setLocked).not.toHaveBeenCalledWith('one-id', false);
  });

  it.each([
    'close',
    'read',
    'publish',
  ] as const)(
    'runs reveal after context activation with a delayed %s',
    async (phase) => {
      const s = setup();
      s.connect();
      s.context(1, 'one');
      await vi.waitFor(() =>
        expect(s.reply).toHaveBeenCalledWith(
          expect.objectContaining({ requestId: 1, status: 'ready' }),
          expect.any(String),
        ),
      );
      let release!: () => void;
      const delay = new Promise<void>((resolve) => { release = resolve; });
      const method = phase === 'read' ? s.api.getState : s.api[phase];
      if (phase === 'read') {
        const original = s.api.getState.getMockImplementation()!;
        s.api.getState.mockImplementationOnce(async (key: string) => {
          await delay;
          return original(key);
        });
      } else {
        const original = s.api[phase].getMockImplementation()!;
        s.api[phase].mockImplementationOnce(async (key: string) => {
          await delay;
          return original(key);
        });
      }
      s.context(2, 'two');
      await vi.waitFor(() => expect(method).toHaveBeenCalledWith(
        phase === 'close' ? 'one' : 'two',
      ));
      s.send({
        type: 'stage-flow-tools:action', sessionId: 'session',
        requestId: 3, questionKey: 'two', action: 'reveal',
      });
      release();
      await vi.waitFor(() => expect(s.reply).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 3, status: 'ready' }),
        expect.any(String),
      ));
      expect(s.states.get('one')!.question.is_active).toBe(false);
      expect(s.states.get('two')!.question.is_active).toBe(true);
      expect(s.states.get('two')!.question.is_locked).toBe(true);
      expect(s.api.setLocked.mock.calls.slice(-2)).toEqual([
        [
          'two-id',
          false,
        ],
        [
          'two-id',
          true,
        ],
      ]);
    },
  );

  it('preserves a pending context when its reveal action arrives', async () => {
    const s = setup();
    let release!: (state: Results) => void;
    s.api.getState.mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve;
    }));
    s.connect();
    s.context(1, 'one');
    s.context(2, 'two');
    s.send({
      type: 'stage-flow-tools:action', sessionId: 'session',
      requestId: 3, questionKey: 'two', action: 'reveal',
    });
    release(s.states.get('one')!);
    await vi.waitFor(() => expect(s.reply).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 3, status: 'ready' }),
      expect.any(String),
    ));
    expect(s.api.publish).toHaveBeenCalledExactlyOnceWith('two');
    expect(s.states.get('two')!.question.is_locked).toBe(true);
  });

  it('discards queued contexts and their actions when a newer context leaves', async () => {
    const s = setup();
    let release!: (state: Results) => void;
    s.api.getState.mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve;
    }));
    s.connect();
    s.context(1, 'one');
    s.context(2, 'two');
    s.send({
      type: 'stage-flow-tools:action', sessionId: 'session',
      requestId: 3, questionKey: 'two', action: 'reveal',
    });
    s.context(4, null);
    release(s.states.get('one')!);
    await vi.waitFor(() => expect(s.reply).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 4, status: 'closed' }),
      expect.any(String),
    ));
    expect(s.api.publish).not.toHaveBeenCalled();
    expect(s.api.setLocked).not.toHaveBeenCalled();
  });

  it('rejects disabled selections and stops processing when destroyed', async () => {
    const s = setup();
    s.states.get('one')!.question.is_disabled = true;
    s.connect();
    s.context(1, 'one');
    await vi.waitFor(() =>
      expect(s.reply).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' }),
        expect.any(String),
      ),
    );
    expect(s.api.publish).not.toHaveBeenCalled();
    s.controller.stop();
    s.context(2, 'two');
    expect(s.api.publish).not.toHaveBeenCalled();
  });
});
