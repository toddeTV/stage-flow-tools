<script setup lang="ts">
const yearStart = 2025
const yearCurrent = new Date().getFullYear()
const yearSpan = yearStart === yearCurrent ? yearStart : `${yearStart} - ${yearCurrent}`
</script>

<template>
  <footer class="p-4 flex flex-col md:flex-row justify-between items-center text-sm gap-4 md:gap-0">
    <div class="text-center md:text-left">
      Copyright © {{ yearSpan }},
      <NuxtLink aria-label="Website of Thorsten Seyschab" target="_blank" to="https://todde.tv/" class="underline">
        Thorsten Seyschab</NuxtLink>.
      All rights reserved.
    </div>
    <div>
      <NuxtLink aria-label="Source Code on GitHub" target="_blank" to="https://github.com/toddeTV/stage-flow-tools/" class="flex items-center space-x-2 underline">
        <span>Source Code on</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
        >
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
      </NuxtLink>
    </div>
  </footer>
</template>