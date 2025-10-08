<script setup lang="ts">
import type { Results } from '~/types'

definePageMeta({
  middleware: 'auth',
  footer: true,
  background: false,
})

const { results } = useQuizSocket('results')

const route = useRoute()
const isCoreView = computed(() => route.query.core !== undefined)

// State for core view parameters
const padding = ref(route.query.padding ? Number(route.query.padding) : 0)
const scale = ref(route.query.scale ? Number(route.query.scale) : 1)
const hideResults = ref(route.query.hideResults !== undefined)

// Add body class for core view

// Dynamic styles for core view
const coreViewStyles = computed(() => {
  if (!isCoreView.value) {
    return {}
  }
  return {
    padding: `${padding.value}px`,
    transform: `scale(${scale.value})`
  }
})

// Function to navigate to core view with parameters
async function goToCoreView() {
  const query = {
    core: '',
    padding: padding.value,
    scale: scale.value,
    hideResults: hideResults.value ? '' : undefined
  }
  await navigateTo({ path: '/results', query })
}

// Fetch initial results
const { data: fetchedResults, refresh: refreshResults } = await useFetch<Results>('/api/results/current')

watch(fetchedResults, (newResults) => {
  if (newResults && newResults.question) {
    results.value = newResults
  }
  else {
    results.value = null
  }
}, { immediate: true })

// Calculate bar width
function getBarWidth(count: number) {
  if (!results.value || results.value.totalVotes === 0) {
    return 0
  }

  const maxVotes = Math.max(...Object.values(results.value.results).map(r => r.count))
  if (maxVotes === 0) {
    return 0
  }

  // Scale to max 90% width for best visual
  return (count / maxVotes) * 90
}

// Calculate percentage
function getPercentage(count: number) {
  if (!results.value || results.value.totalVotes === 0) {
    return 0
  }
  return Math.round((count / results.value.totalVotes) * 100)
}

async function pickRandomUser(option: string) {
  try {
    const response = await $fetch('/api/results/pick-random-user', {
      method: 'POST',
      body: {
        questionId: results.value?.question.id,
        option
      }
    })
    if (response.username) {
      alert(`Random user for "${option}": ${response.username}`)
    } else {
      alert("No users found for this option.")
    }
  }
  catch (error: unknown) {
    logger_error(error)
    alert('Could not pick a random user. See console for details.')
  }
}

</script>

<template>
  <div :class="{ 'max-w-4xl mx-auto p-5 min-h-screen': !isCoreView }">
    <div :style="coreViewStyles">
      <UiPageTitle v-if="!isCoreView" class="relative page-title">Live Results</UiPageTitle>

      <UiSection v-if="results" :bare="isCoreView">
      <!-- Question Display -->
      <div class="mb-10 border-b-[3px] border-black pb-5">
        <h2 class="text-3xl mb-4 leading-tight">{{ results.question.question_text }}</h2>
        <div class="flex justify-between items-center text-lg">
          <span class="font-bold py-2 px-4 bg-gray-100 border-2 border-black">Total Votes: {{ results.totalVotes }} ({{ results.totalConnections > 0 ? Math.round((results.totalVotes / results.totalConnections) * 100) : 0 }}%)</span>
          <div class="flex items-center gap-4">
            <UiButton @click="refreshResults" variant="secondary" size="small">
              🔄 Refresh
            </UiButton>
            <span
              class="py-2 px-4 border-2 border-black uppercase font-bold"
              :class="results.question.is_locked ? 'bg-black text-white' : 'bg-white text-black'"
            >
              {{ results.question.is_locked ? '🔒 Locked' : '🔓 Open' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Results Chart -->
      <div class="flex flex-col gap-6">
        <div
          v-for="(result, option) in results.results"
          :key="option"
          class="flex flex-col gap-2.5"
        >
          <div class="flex justify-between items-center text-lg">
            <span class="font-bold">{{ option }} <span v-if="result.emoji && !hideResults" class="ml-2">{{ result.emoji }}</span></span>
            <div class="flex items-center gap-2">
              <span class="py-1 px-2.5 bg-gray-100 border-2 border-black text-sm">
                <template v-if="hideResults">?</template>
                <template v-else>{{ result.count }}</template>
                votes
              </span>
              <UiButton size="small" @click="pickRandomUser(option)">🎲</UiButton>
            </div>
          </div>
          <div class="h-12 bg-gray-100 border-[3px] border-black relative overflow-hidden">
            <div v-if="hideResults" class="flex items-center justify-center h-full">
              <span class="text-2xl font-bold text-gray-400">?</span>
            </div>
            <div
              v-else
              class="h-full bg-black transition-width duration-500 ease-out flex items-center justify-end pr-2.5 min-w-[50px] relative result-bar"
              :style="{ width: getBarWidth(result.count) + '%' }"
            >
              <span class="text-white font-bold text-xl text-shadow-lg relative z-10">{{ getPercentage(result.count) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Note Display -->
      <div v-if="results.question.note && !hideResults" class="mt-8 p-4 bg-gray-100 border-2 border-black">
        <p>{{ results.question.note }}</p>
      </div>
    </UiSection>

    <!-- No Active Question -->
    <UiSection v-else :bare="isCoreView" :class="{ 'py-20 px-8 text-center': !isCoreView }">
      <h2 class="text-3xl mb-4">No Active Question</h2>
      <p class="text-xl mb-8">Waiting for a question to be published...</p>
      <div class="flex justify-center gap-2.5">
        <span class="w-5 h-5 bg-black animate-bounce"></span>
        <span class="w-5 h-5 bg-black animate-bounce [animation-delay:0.2s]"></span>
        <span class="w-5 h-5 bg-black animate-bounce [animation-delay:0.4s]"></span>
      </div>
      </UiSection>
    </div>

    <!-- Navigation -->
    <div v-if="!isCoreView" class="flex flex-col items-center gap-5 mt-8">
      <div class="flex justify-center gap-5">
      </div>

      <!-- Core View Controls -->
      <div class="p-4 w-full max-w-md flex flex-col items-center gap-4">
        <h3 class="text-lg font-bold">Core View Generator</h3>
        <div class="grid grid-cols-2 gap-4 w-full">
          <div class="flex flex-col gap-1">
            <label for="padding" class="text-sm font-bold">Padding (px)</label>
            <UiInput id="padding" v-model="padding" type="number" placeholder="e.g., 20" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="scale" class="text-sm font-bold">Scale</label>
            <UiInput id="scale" v-model="scale" type="number" step="0.1" placeholder="e.g., 1.0" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input id="hideResults" v-model="hideResults" type="checkbox" class="w-4 h-4">
          <label for="hideResults" class="text-sm font-bold">Hide Results</label>
        </div>
        <UiButton @click="goToCoreView">
          Generate Core View
        </UiButton>
      </div>
    </div>
  </div>
</template>


<style scoped>
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

.text-shadow-lg {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
</style>