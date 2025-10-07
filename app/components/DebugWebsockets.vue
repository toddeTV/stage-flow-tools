<script setup lang="ts">
const { data: connections, refresh: refreshConnections } = useFetch('/api/websockets/connections')
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 p-4 bg-gray-100 border-t border-gray-300 max-h-52 overflow-y-auto">
    <h3 class="font-bold mb-2">Active WebSocket Connections</h3>
    <button @click="() => refreshConnections()" class="mb-2 px-2 py-1 bg-black text-white border-2 border-black hover:bg-white hover:text-black">Refresh</button>
    <ul v-if="connections && connections.length > 0" class="text-sm">
      <li v-for="connection in connections" :key="connection.id">
        <strong class="font-semibold">ID:</strong> {{ connection.id }} | <strong class="font-semibold">URL:</strong> {{ connection.url }}
      </li>
    </ul>
    <div v-else class="text-sm">
      No websockets.
    </div>
  </div>
</template>
