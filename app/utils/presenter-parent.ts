import { safeParse } from 'valibot'
import type { PresenterSelection } from '~/composables/presenter/controller'
import { PresenterParentCommandSchema } from '#shared/utils/validation'

/** One trusted parent session; only the latest confirmed context receives an acknowledgement. */
export function createPresenterParentBridge(options: {
  allowedOrigins: string[]
  parent: Window
  select: (selection: PresenterSelection | null) => Promise<boolean>
  reply: (data: unknown, origin: string) => void
}) {
  let sessionId: string | undefined
  let origin: string | undefined
  let requestId = 0
  let stopped = false
  return {
    handleMessage(event: Pick<MessageEvent, 'data' | 'source' | 'origin'>) {
      if (stopped || event.source !== options.parent || !options.allowedOrigins.includes(event.origin)) return
      const parsed = safeParse(PresenterParentCommandSchema, event.data)
      if (!parsed.success) return
      const command = parsed.output
      if (command.type === 'stage-flow-tools:connect') {
        if (sessionId && (sessionId !== command.sessionId || origin !== event.origin)) return
        sessionId = command.sessionId
        origin = event.origin
        options.reply({ type: 'stage-flow-tools:ready', sessionId }, origin)
      }
      else if (command.sessionId === sessionId && event.origin === origin && command.requestId > requestId) {
        requestId = command.requestId
        void options.select(command.selection).then((success) => {
          if (stopped || command.requestId !== requestId) return
          options.reply({
            type: 'stage-flow-tools:ack', sessionId, requestId,
            questionKey: command.selection?.questionKey ?? null,
            status: success ? command.selection ? 'ready' : 'closed' : 'error',
          }, event.origin)
        })
      }
    },
    stop() { stopped = true },
  }
}
