<script setup lang="ts">
const { language, availableLanguages, selectLanguage } = useQuestionLanguage()
const { t } = useI18n()
function onChange(event: Event) {
  void selectLanguage((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <select
    :aria-label="t('selectLanguage')"
    class="border-2 border-black bg-white px-2 py-1 text-sm"
    :value="language"
    @change="onChange"
  >
    <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
      {{ lang.label }}
    </option>
  </select>
</template>

<i18n lang="yaml">
en:
  selectLanguage: Select language
de:
  selectLanguage: Sprache auswählen
fr:
  selectLanguage: Sélectionner la langue
ja:
  selectLanguage: 言語を選択
</i18n>
