<script setup lang="ts">
const config = useRuntimeConfig()
const appVersion = config.public.version
</script>

<template>
  <footer class="flex flex-col items-center justify-between gap-4 p-4 text-sm md:flex-row md:gap-0">
    <div class="flex flex-wrap items-center justify-center gap-x-1 text-center md:justify-start md:text-left">
      <span>Created with</span>
      <svg
        aria-hidden="true"
        class="size-4 fill-red-600 stroke-red-600"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.02 6.02 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"
        />
      </svg>
      <span>by</span>
      <NuxtLink
        aria-label="Website of todde.tv"
        class="underline"
        target="_blank"
        to="https://todde.tv/"
      >
        todde.tv</NuxtLink>
      <span aria-hidden="true">·</span>
      <span>Copyright (c) 2025-present.</span>
    </div>
    <div class="flex items-center space-x-4">
      <NuxtLink class="underline" to="/legal-notice">
        Legal Notice
      </NuxtLink>
      <NuxtLink class="underline" to="/privacy-policy">
        Privacy Policy
      </NuxtLink>
      <span>v{{ appVersion }}</span>
      <NuxtLink
        aria-label="Source Code on GitHub"
        class="flex items-center space-x-2 underline"
        target="_blank"
        to="https://github.com/toddeTV/stage-flow-tools/"
      >
        <span>Source Code on</span>
        <svg
          class="size-5"
          fill="none"
          height="24"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
          />
        </svg>
      </NuxtLink>
    </div>
  </footer>
</template>
