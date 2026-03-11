<script setup lang="ts">
const { locale, locales } = useI18n({ useScope: 'global' })
const { t } = useI18n()

const languageMap: Record<string, string> = {
  en: '🇺🇸',
  de: '🇩🇪',
  ja: '🇯🇵'
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="text-2xl">{{ languageMap[locale] || locale }}</span>
    <select v-model="locale" class="p-2 border-2 border-black bg-white" :aria-label="t('selectLanguage')">
      <option v-for="lang in locales" :key="lang.code" :value="lang.code">
        {{ lang.name }}
      </option>
    </select>
  </div>
</template>

<i18n lang="yaml">
en:
  selectLanguage: "Select language"
de:
  selectLanguage: "Sprache auswählen"
ja:
  selectLanguage: "言語を選択"
</i18n>