import { onBeforeUnmount, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import type { PresenterCurrentState, Question } from '~/types'
import { createPresenterQuizController, type PresenterQuizOptions } from './presenter/controller'
import { usePresenterParent } from './usePresenterParent'

export { createPresenterQuizController } from './presenter/controller'
export type { PresenterErrorKind, PresenterQuizApi } from './presenter/controller'
export type PresenterBoundaryMessage = { direction: 'next' | 'previous', type: 'stage-flow-tools:presenter-boundary' }

/** Connects the existing Presenter to APIs, polling, and optional parent selection. */
export function usePresenterQuiz(
  pollIntervalSeconds: Readonly<Ref<number>>,
  options?: Readonly<Ref<PresenterQuizOptions>>,
) {
  const controller = createPresenterQuizController({
    options: options?.value,
    api: {
      getCurrentState: key => $fetch<PresenterCurrentState>('/api/admin/presenter/current-state', {
        query: key ? { key } : undefined,
      }),
      getQuestions: () => $fetch<Question[]>('/api/questions'),
      publishQuestion: key => $fetch('/api/questions/publish', { body: { key }, method: 'POST' }),
      toggleQuestionLock: (questionId, locked) => $fetch('/api/questions/toggle-lock', {
        body: { questionId, locked }, method: 'POST',
      }),
      unpublishActiveQuestion: expectedKey => $fetch('/api/questions/unpublish-active', {
        body: { expectedKey }, method: 'POST',
      }),
    },
    emitBoundary(direction) {
      window.parent.postMessage({
        direction, type: 'stage-flow-tools:presenter-boundary',
      } satisfies PresenterBoundaryMessage, '*')
    },
  })
  usePresenterParent(controller, options?.value.parentManaged === true && !options.value.invalidSelection)
  watch(pollIntervalSeconds, seconds => controller.startPolling(seconds * 1000))
  if (options) watch(options, (next, previous) => {
    if (next.parentManaged) return
    if ([
      'questionKey',
      'questionCount',
      'mode',
      'readOnly',
      'showLeaderboard',
      'showRecap',
      'invalidSelection',
    ]
      .some(key => next[key as keyof PresenterQuizOptions] !== previous[key as keyof PresenterQuizOptions])) {
      void controller.initialize(next)
    }
  })
  onMounted(() => {
    if (!options?.value.parentManaged || options.value.invalidSelection) void controller.initialize()
    controller.startPolling(pollIntervalSeconds.value * 1000)
    window.addEventListener('focus', controller.activate)
  })
  onBeforeUnmount(() => {
    controller.stop()
    window.removeEventListener('focus', controller.activate)
  })
  return controller
}
