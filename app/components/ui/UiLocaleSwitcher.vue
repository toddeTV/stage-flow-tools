<script setup lang="ts">
const { locale, locales } = useI18n()

const languageMap: Record<string, string> = {
  en: '🇺🇸',
  de: '🇩🇪',
  ja: '🇯🇵'
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-2xl">{{ languageMap[locale] }}</span>
    <select v-model="locale" class="p-2 border-2 border-black bg-white" aria-label="Select language">
      <option v-for="lang in locales" :key="lang.code" :value="lang.code">
        {{ lang.name }}
      </option>
    </select>
  </div>
</template>