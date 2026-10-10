<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { Results } from '~/types';
import { createPresenterEmbedController } from '~/utils/presenter-embed-controller';

const error = ref(false);
let controller: ReturnType<typeof createPresenterEmbedController> | undefined;
let stopped = false;

function handleMessage(event: MessageEvent) {
  controller?.handleMessage(event);
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
  } catch {
    error.value = true;
  }
});

onBeforeUnmount(() => {
  stopped = true;
  window.removeEventListener('message', handleMessage);
  controller?.stop();
});
</script>

<template>
  <p role="status">
    {{ error ? "Controller unavailable" : "Presentation controller" }}
  </p>
</template>
