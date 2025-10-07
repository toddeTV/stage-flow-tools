<script setup lang="ts">
import type { Results } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const { results } = useQuizSocket()

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

  const maxVotes = Math.max(...Object.values(results.value.results))
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

</script>

<template>
  <div class="max-w-4xl mx-auto p-5 min-h-screen">
    <UiPageTitle class="relative page-title">Live Results</UiPageTitle>

    <UiSection v-if="results" class="border-[5px]">
      <!-- Question Display -->
      <div class="mb-10 border-b-[3px] border-black pb-5">
        <h2 class="text-3xl mb-4 leading-tight">{{ results.question.question_text }}</h2>
        <div class="flex justify-between items-center text-lg">
          <span class="font-bold py-2 px-4 bg-gray-100 border-2 border-black">Total Votes: {{ results.totalVotes }}</span>
          <span
            class="py-2 px-4 border-2 border-black uppercase font-bold"
            :class="results.question.is_locked ? 'bg-black text-white' : 'bg-white text-black'"
          >
            {{ results.question.is_locked ? '🔒 Locked' : '🔓 Open' }}
          </span>
        </div>
      </div>

      <!-- Results Chart -->
      <div class="flex flex-col gap-6">
        <div
          v-for="(count, option) in results.results"
          :key="option"
          class="flex flex-col gap-2.5"
        >
          <div class="flex justify-between items-center text-lg">
            <span class="font-bold">{{ option }}</span>
            <span class="py-1 px-2.5 bg-gray-100 border-2 border-black text-sm">{{ count }} votes</span>
          </div>
          <div class="h-12 bg-gray-100 border-[3px] border-black relative overflow-hidden">
            <div
              class="h-full bg-black transition-width duration-500 ease-out flex items-center justify-end pr-2.5 min-w-[50px] relative result-bar"
              :style="{ width: getBarWidth(count) + '%' }"
            >
              <span class="text-white font-bold text-xl text-shadow-lg relative z-10">{{ getPercentage(count) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </UiSection>

    <!-- No Active Question -->
    <UiSection v-else class="border-[5px] py-20 px-8 text-center">
      <h2 class="text-3xl mb-4">No Active Question</h2>
      <p class="text-xl mb-8">Waiting for a question to be published...</p>
      <div class="flex justify-center gap-2.5">
        <span class="w-5 h-5 bg-black animate-bounce"></span>
        <span class="w-5 h-5 bg-black animate-bounce [animation-delay:0.2s]"></span>
        <span class="w-5 h-5 bg-black animate-bounce [animation-delay:0.4s]"></span>
      </div>
    </UiSection>

    <!-- Navigation -->
    <div class="flex justify-center gap-5 mt-8">
      <UiButton @click="refreshResults" variant="link">
        Refresh
      </UiButton>
      <NuxtLink to="/">
        <UiButton variant="link">
          ← Back to Quiz
        </UiButton>
      </NuxtLink>
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