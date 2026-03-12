<script setup lang="ts">
const { data: connections, refresh: refreshConnections } = useFetch('/api/websockets/connections')
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 max-h-52 overflow-y-auto border-t border-gray-300 bg-gray-100 p-4">
    <h3 class="mb-2 font-bold">
      Active WebSocket Connections
    </h3>
    <button
      class="mb-2 border-2 border-black bg-black px-2 py-1 text-white hover:bg-white hover:text-black"
      @click="() => refreshConnections()"
    >
      Refresh
    </button>
    <ul v-if="connections && connections.length > 0" class="text-sm">
      <li v-for="connection in connections" :key="connection.id">
        <strong class="font-semibold">ID:</strong> {{ connection.id }}
        | <strong class="font-semibold">URL:</strong> {{ connection.url }}
      </li>
    </ul>
    <div v-else class="text-sm">
      No websockets.
    </div>
  </div>
</template>
