<script setup lang="ts">
const config = useRuntimeConfig()
const websocketDebug = config.public.debug.showWebsocketConnectionsInFrontend
</script>

<template>
  <div>
    <slot />
    <DebugWebsockets v-if="websocketDebug" />
  </div>
</template>