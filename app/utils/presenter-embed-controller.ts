import { safeParse } from 'valibot';
import type { InferOutput } from 'valibot';
import type { Results } from '~/types';
import { PresenterEmbedCommandSchema } from '#shared/utils/validation';

type Command = InferOutput<typeof PresenterEmbedCommandSchema>;
type Request = Exclude<Command, { type: 'stage-flow-tools:connect' }>;
type Selection = Extract<
  Request,
  { type: 'stage-flow-tools:context' }
>['selection'];

export interface ScopedPresenterApi {
  getState: (key: string) => Promise<Results>;
  publish: (key: string) => Promise<unknown>;
  setLocked: (id: string, locked: boolean) => Promise<unknown>;
  close: (expectedKey: string) => Promise<unknown>;
}

/** One trusted parent session; latest desired context wins without clearing answers. */
export function createPresenterEmbedController(options: {
  allowedOrigins: string[];
  parent: Window;
  api: ScopedPresenterApi;
  reply: (data: unknown, origin: string) => void;
}) {
  let sessionId: string | undefined;
  let parentOrigin: string | undefined;
  let lastRequestId = 0;
  let selection: Selection = null;
  let ownedKey: string | undefined;
  let pending: Request | undefined;
  let running = false;
  let stopped = false;

  function reply(request: Request, status: 'ready' | 'closed' | 'error') {
    if (stopped || !parentOrigin) return;
    options.reply(
      {
        type: 'stage-flow-tools:ack',
        sessionId,
        requestId: request.requestId,
        questionKey:
          request.type === 'stage-flow-tools:context'
            ? (request.selection?.questionKey ?? null)
            : request.questionKey,
        status,
      },
      parentOrigin,
    );
  }

  async function activate(request: Request, key: string, reopen: boolean) {
    const state = await options.api.getState(key);
    if (stopped || request.requestId !== lastRequestId) return;
    if (state.question.key !== key || state.question.is_disabled)
      throw new Error('Invalid selection');
    if (reopen || !state.question.alreadyPublished) {
      await options.api.publish(key);
      ownedKey = key;
      if (!stopped && request.requestId === lastRequestId)
        await options.api.setLocked(state.question.id, false);
    } else if (state.question.is_active) ownedKey = key;
  }

  async function process(request: Request) {
    if (request.type === 'stage-flow-tools:context') {
      const key = request.selection?.questionKey;
      if (ownedKey && ownedKey !== key) {
        await options.api.close(ownedKey);
        ownedKey = undefined;
      }
      if (stopped || request.requestId !== lastRequestId) return;
      if (key) await activate(request, key, false);
      reply(request, key ? 'ready' : 'closed');
      return;
    }
    if (selection?.questionKey !== request.questionKey) return;
    if (request.action === 'reopen')
      await activate(request, request.questionKey, true);
    else {
      const state = await options.api.getState(request.questionKey);
      if (stopped || request.requestId !== lastRequestId) return;
      if (
        !state.question.is_active ||
        state.question.key !== request.questionKey
      )
        throw new Error('Question is closed');
      await options.api.setLocked(state.question.id, true);
    }
    reply(request, 'ready');
  }

  async function drain() {
    if (running) return;
    running = true;
    try {
      while (pending && !stopped) {
        const request = pending;
        pending = undefined;
        try {
          await process(request);
        } catch {
          reply(request, 'error');
        }
      }
    } finally {
      running = false;
    }
  }

  function handleMessage(
    event: Pick<MessageEvent, 'data' | 'source' | 'origin'>,
  ) {
    if (
      stopped ||
      event.source !== options.parent ||
      !options.allowedOrigins.includes(event.origin)
    )
      return;
    const parsed = safeParse(PresenterEmbedCommandSchema, event.data);
    if (!parsed.success) return;
    const command = parsed.output;
    if (command.type === 'stage-flow-tools:connect') {
      if (sessionId && command.sessionId !== sessionId) return;
      sessionId = command.sessionId;
      parentOrigin = event.origin;
      options.reply(
        { type: 'stage-flow-tools:ready', sessionId },
        event.origin,
      );
      return;
    }
    if (
      command.sessionId !== sessionId ||
      event.origin !== parentOrigin ||
      command.requestId <= lastRequestId
    )
      return;
    if (
      command.type === 'stage-flow-tools:action' &&
      selection?.questionKey !== command.questionKey
    )
      return;
    lastRequestId = command.requestId;
    if (command.type === 'stage-flow-tools:context')
      selection = command.selection;
    pending = command;
    void drain();
  }

  return {
    handleMessage,
    stop: () => {
      stopped = true;
      pending = undefined;
    },
  };
}
