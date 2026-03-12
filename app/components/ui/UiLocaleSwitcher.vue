<script setup lang="ts">
const { locale, locales } = useI18n({ useScope: 'global' })
const { t } = useI18n()

const languageMap: Record<string, string> = {
  en: '🇺🇸',
  de: '🇩🇪',
  ja: '🇯🇵',
}
</script>

<template>
  <select v-model="locale" :aria-label="t('selectLanguage')" class="border-2 border-black bg-white px-2 py-1 text-sm">
    <option v-for="lang in locales" :key="lang.code" :value="lang.code">
      {{ languageMap[lang.code] }} {{ lang.name }}
    </option>
  </select>
</template>

<i18n lang="yaml">
en:
  selectLanguage: Select language
de:
  selectLanguage: Sprache auswählen
ja:
  selectLanguage: 言語を選択
</i18n>
