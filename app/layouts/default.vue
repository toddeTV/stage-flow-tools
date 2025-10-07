<script setup lang="ts">
const config = useRuntimeConfig()
const websocketDebug = config.public.debug.showWebsocketConnectionsInFrontend
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <main class="flex-grow">
      <slot />
    </main>
    <AppFooter />
    <DebugWebsockets v-if="websocketDebug" />
  </div>
</template>