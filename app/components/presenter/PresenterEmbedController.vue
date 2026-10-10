<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { safeParse } from 'valibot';
import type { Results } from '~/types';
import { createPresenterEmbedController } from '~/utils/presenter-embed-controller';
import { PresenterEmbedCommandSchema } from '#shared/utils/validation';

const error = ref(false);
let controller: ReturnType<typeof createPresenterEmbedController> | undefined;
let pendingConnect: Pick<MessageEvent, 'data' | 'source' | 'origin'> | undefined;
let stopped = false;

function handleMessage(event: MessageEvent) {
  if (controller) controller.handleMessage(event);
  else if (event.source === window.parent && !error.value) {
    const parsed = safeParse(PresenterEmbedCommandSchema, event.data);
    if (parsed.success && parsed.output.type === 'stage-flow-tools:connect')
      pendingConnect = {
        data: parsed.output,
        source: event.source,
        origin: event.origin,
      };
  }
}

onMounted(async () => {
  window.addEventListener('message', handleMessage);
  try {
    const { allowedOrigins } = await $fetch<{ allowedOrigins: string[] }>(
      '/api/admin/presenter/embed-config',
    );
    if (stopped) return;
    controller = createPresenterEmbedController({
      allowedOrigins,
      parent: window.parent,
      api: {
        getState: (key) =>
          $fetch<Results>('/api/admin/presenter/question-state', {
            query: { key },
          }),
        publish: (key) =>
          $fetch('/api/questions/publish', { method: 'POST', body: { key } }),
        setLocked: (questionId, locked) =>
          $fetch('/api/questions/toggle-lock', {
            method: 'POST',
            body: { questionId, locked },
          }),
        close: (expectedKey) =>
          $fetch('/api/questions/unpublish-active', {
            method: 'POST',
            body: { expectedKey },
          }),
      },
      reply: (data, origin) => window.parent.postMessage(data, origin),
    });
    if (pendingConnect) controller.handleMessage(pendingConnect);
    pendingConnect = undefined;
  } catch {
    pendingConnect = undefined;
    error.value = true;
  }
});

onBeforeUnmount(() => {
  stopped = true;
  pendingConnect = undefined;
  window.removeEventListener('message', handleMessage);
  controller?.stop();
});
</script>

<template>
  <p role="status">
    {{ error ? "Controller unavailable" : "Presentation controller" }}
  </p>
</template>
