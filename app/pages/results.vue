<template>
  <div class="results-container">
    <h1 class="page-title">Live Results</h1>
    
    <div v-if="results" class="results-section">
      <!-- Question Display -->
      <div class="question-display">
        <h2>{{ results.question.question_text }}</h2>
        <div class="question-meta">
          <span class="total-votes">Total Votes: {{ results.totalVotes }}</span>
          <span class="lock-status" :class="{ locked: results.question.is_locked }">
            {{ results.question.is_locked ? '🔒 Locked' : '🔓 Open' }}
          </span>
        </div>
      </div>
      
      <!-- Results Chart -->
      <div class="results-chart">
        <div
          v-for="(count, option) in results.results"
          :key="option"
          class="result-bar-container"
        >
          <div class="result-label">
            <span class="option-text">{{ option }}</span>
            <span class="vote-count">{{ count }} votes</span>
          </div>
          <div class="result-bar-wrapper">
            <div
              class="result-bar"
              :style="{
                width: getBarWidth(count) + '%'
              }"
            >
              <span class="percentage">{{ getPercentage(count) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Active Question -->
    <div v-else class="no-results">
      <h2>No Active Question</h2>
      <p>Waiting for a question to be published...</p>
      <div class="waiting-animation">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
    
    <!-- Navigation -->
    <div class="navigation">
      <NuxtLink to="/" class="back-btn">
        ← Back to Quiz
      </NuxtLink>
      <button @click="refreshResults" class="refresh-btn">
        Refresh Results
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const results = ref(null)
let ws = null
let refreshInterval = null

// Load results on mount
onMounted(async () => {
  await loadResults()
  setupWebSocket()
  
  // Auto-refresh every 5 seconds as backup
  refreshInterval = setInterval(() => {
    loadResults()
  }, 5000)
})

// Cleanup on unmount
onUnmounted(() => {
  if (ws) {
    ws.close()
  }
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Load current results
async function loadResults() {
  try {
    const data = await $fetch('/api/results/current')
    if (data && !data.message) {
      results.value = data
    } else {
      results.value = null
    }
  } catch (error) {
    console.error('Failed to load results:', error)
  }
}

// Refresh results manually
async function refreshResults() {
  await loadResults()
}

// Calculate bar width
function getBarWidth(count) {
  if (!results.value || results.value.totalVotes === 0) {
    return 0
  }
  
  const maxVotes = Math.max(...Object.values(results.value.results))
  if (maxVotes === 0) return 0
  
  // Scale to max 90% width for best visual
  return (count / maxVotes) * 90
}

// Calculate percentage
function getPercentage(count) {
  if (!results.value || results.value.totalVotes === 0) {
    return 0
  }
  return Math.round((count / results.value.totalVotes) * 100)
}

// Setup WebSocket for real-time updates
function setupWebSocket() {
  const config = useRuntimeConfig()
  
  // Use the public WebSocket URL if provided, otherwise use the current host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = config.public.wsUrl || window.location.host
  
  // Ensure we have the correct format - if wsUrl is provided, use it directly
  const wsEndpoint = config.public.wsUrl ? `${config.public.wsUrl}/_ws` : `${protocol}//${host}/_ws`
  
  ws = new WebSocket(wsEndpoint)
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.event === 'results-update') {
        // Update results
        results.value = data.data
      } else if (data.event === 'new-question') {
        // New question, reset results
        results.value = null
        // Load new results
        setTimeout(loadResults, 500)
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  }
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
  
  ws.onclose = () => {
    // Attempt to reconnect after 3 seconds
    setTimeout(() => {
      setupWebSocket()
    }, 3000)
  }
  
  // Send ping every 30 seconds to keep connection alive
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping')
    }
  }, 30000)
}
</script>

<style scoped>
.results-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.page-title {
  text-align: center;
  font-size: 3rem;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 3px;
  border-bottom: 5px solid #000;
  padding-bottom: 20px;
  position: relative;
}

.page-title::after {
  content: '●';
  position: absolute;
  right: 20px;
  color: #ff0000;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Results Section */
.results-section {
  background: #fff;
  border: 5px solid #000;
  padding: 30px;
  margin-bottom: 30px;
}

/* Question Display */
.question-display {
  margin-bottom: 40px;
  border-bottom: 3px solid #000;
  padding-bottom: 20px;
}

.question-display h2 {
  font-size: 1.8rem;
  margin-bottom: 15px;
  line-height: 1.4;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
}

.total-votes {
  font-weight: bold;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 2px solid #000;
}

.lock-status {
  padding: 8px 16px;
  background: #fff;
  border: 2px solid #000;
  text-transform: uppercase;
  font-weight: bold;
}

.lock-status.locked {
  background: #000;
  color: #fff;
}

/* Results Chart */
.results-chart {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.result-bar-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
}

.option-text {
  font-weight: bold;
}

.vote-count {
  padding: 5px 10px;
  background: #f5f5f5;
  border: 2px solid #000;
  font-size: 0.9rem;
}

.result-bar-wrapper {
  height: 50px;
  background: #f5f5f5;
  border: 3px solid #000;
  position: relative;
  overflow: hidden;
}

.result-bar {
  height: 100%;
  background: #000;
  transition: width 0.5s ease-out;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  min-width: 50px;
  position: relative;
}

.result-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 255, 255, 0.1) 10px,
    rgba(255, 255, 255, 0.1) 20px
  );
}

.percentage {
  color: #fff;
  font-weight: bold;
  font-size: 1.2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1;
}

/* No Results */
.no-results {
  background: #fff;
  border: 5px solid #000;
  padding: 80px 30px;
  text-align: center;
  margin-bottom: 30px;
}

.no-results h2 {
  font-size: 2rem;
  margin-bottom: 15px;
}

.no-results p {
  font-size: 1.2rem;
  margin-bottom: 30px;
}

/* Waiting Animation */
.waiting-animation {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.waiting-animation span {
  width: 20px;
  height: 20px;
  background: #000;
  animation: bounce 1.4s ease-in-out infinite;
}

.waiting-animation span:nth-child(2) {
  animation-delay: 0.2s;
}

.waiting-animation span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
}

/* Navigation */
.navigation {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.back-btn,
.refresh-btn {
  padding: 15px 30px;
  background: #fff;
  color: #000;
  border: 3px solid #000;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-block;
}

.back-btn:hover,
.refresh-btn:hover {
  background: #000;
  color: #fff;
  transform: translateY(-3px);
  box-shadow: 0 5px 0 #000;
}
</style>