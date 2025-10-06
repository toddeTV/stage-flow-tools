<script setup lang="ts">
const { data: connections, refresh: refreshConnections } = useFetch('/api/websockets/connections')
</script>

<template>
  <div class="debug-websockets">
    <h3>Active WebSocket Connections</h3>
    <button @click="() => refreshConnections()">Refresh</button>
    <ul v-if="connections && connections.length > 0">
      <li v-for="connection in connections" :key="connection.id">
        <strong>ID:</strong> {{ connection.id }} | <strong>URL:</strong> {{ connection.url }}
      </li>
    </ul>
    <div v-else>
      No websockets.
    </div>
  </div>
</template>

<style scoped>
.debug-websockets {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: #f0f0f0;
  border-top: 1px solid #ccc;
  max-height: 200px;
  overflow-y: auto;
}
</style>