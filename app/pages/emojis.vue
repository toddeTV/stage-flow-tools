<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

interface Emoji {
  id: string
  text: string
  x: number
  y: number
  speed: number
  rotation: number
}

const emojis = ref<Emoji[]>([])
const { width: windowWidth, height: windowHeight } = useWindowSize()

const route = useRoute()
const scale = computed(() => Number(route.query.scale) || 1)
const transparency = computed(() => {
  const val = Number(route.query.transparency) || 1
  return Math.min(val, 1)
})

// WebSocket connection
const wsEndpoint = computed(() => getWsEndpoint('default', { channel: 'emojis' }))
const { data } = useWebSocket(wsEndpoint, {
  autoReconnect: true,
})

watch(data, (newValue) => {
  try {
    const event = JSON.parse(newValue)
    if (event.event === 'emoji' && event.data?.emoji && event.data?.id) {
      addEmoji(event.data.emoji, event.data.id)
    }
  }
  catch (error) {
    logger_error('Failed to parse WebSocket message:', error)
  }
})

function addEmoji(text: string, id: string) {
  const newEmoji: Emoji = {
    id,
    text,
    x: Math.random() * windowWidth.value,
    y: -100, // Start above the screen
    speed: Math.random() * 3 + 2, // Random speed
    rotation: Math.random() * 40 - 20 // Random rotation -20 to 20 deg
  }
  emojis.value.push(newEmoji)
}

function animateEmojis() {
  emojis.value = emojis.value.map(emoji => ({
    ...emoji,
    y: emoji.y + emoji.speed
  })).filter(emoji => emoji.y < windowHeight.value + 100) // Remove when off-screen

  requestAnimationFrame(animateEmojis)
}

onMounted(() => {
  animateEmojis()
})

useHead({
  bodyAttrs: {
    class: 'emojis-body'
  }
})
</script>

<template>
  <div class="fixed inset-0 overflow-hidden">
    <div
      v-for="emoji in emojis"
      :key="emoji.id"
      class="absolute text-6xl"
      :style="{
        left: `${emoji.x}px`,
        top: `${emoji.y}px`,
        transform: `scale(${scale}) rotate(${emoji.rotation}deg)`,
        opacity: transparency,
        pointerEvents: 'none'
      }"
    >
      {{ emoji.text }}
    </div>
  </div>
</template>

<style>
.emojis-body {
  @apply bg-white;
}

.emojis-body::before {
  content: none;
}
</style>