<script setup lang="ts">
const config = useRuntimeConfig()
const websocketDebug = config.public.debug.showWebsocketConnectionsInFrontend

const route = useRoute()
const props = computed(() => ({
  footer: route.meta.footer ?? true,
  background: route.meta.background ?? true,
}))
</script>

<template>
  <div class="flex flex-col min-h-screen" :class="{ 'has-background': props.background }">
    <main class="flex-grow">
      <slot />
    </main>
    <AppFooter v-if="props.footer" />
    <DebugWebsockets v-if="websocketDebug" />
  </div>
</template>

<style scoped>
.has-background {
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 50px,
      rgba(0, 0, 0, 0.03) 50px,
      rgba(0, 0, 0, 0.03) 100px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 50px,
      rgba(0, 0, 0, 0.03) 50px,
      rgba(0, 0, 0, 0.03) 100px
    );
}
</style>