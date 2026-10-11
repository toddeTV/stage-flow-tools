import { onBeforeUnmount, onMounted } from 'vue'
import { createPresenterParentBridge } from '~/utils/presenter-parent'
import type { createPresenterQuizController } from './presenter/controller'

/** Parent commands select the existing Presenter without changing its authentication role. */
export function usePresenterParent(controller: ReturnType<typeof createPresenterQuizController>, enabled: boolean) {
  let bridge: ReturnType<typeof createPresenterParentBridge> | undefined
  let pendingConnect: Pick<MessageEvent, 'data' | 'source' | 'origin'> | undefined
  let stopped = false
  function message(event: MessageEvent) {
    if (bridge) bridge.handleMessage(event)
    else if (event.source === window.parent && event.data?.type === 'stage-flow-tools:connect') {
      pendingConnect = { data: event.data, source: event.source, origin: event.origin }
    }
  }
  onMounted(async () => {
    if (!enabled) return
    window.addEventListener('message', message)
    try {
      const { allowedOrigins } = await $fetch<{ allowedOrigins: string[] }>('/api/admin/presenter/embed-config')
      if (stopped) return
      bridge = createPresenterParentBridge({
        allowedOrigins, parent: window.parent, select: controller.select,
        reply: (data, origin) => window.parent.postMessage(data, origin),
      })
      if (pendingConnect) bridge.handleMessage(pendingConnect)
      pendingConnect = undefined
    }
    catch { if (!stopped) controller.errorKind.value = 'load' }
  })
  onBeforeUnmount(() => {
    stopped = true
    pendingConnect = undefined
    window.removeEventListener('message', message)
    bridge?.stop()
  })
}
