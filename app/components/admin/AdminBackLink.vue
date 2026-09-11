<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <NuxtLink
    class="mb-5 inline-flex min-h-11 items-center border-[3px] border-black bg-white px-4 py-2 text-sm uppercase
      transition-all duration-200 hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]
      focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-black"
    to="/admin"
  >
    {{ t('backToAdmin') }}
  </NuxtLink>
</template>

<i18n lang="yaml">
en:
  backToAdmin: Back to Admin
de:
  backToAdmin: Zurück zur Admin-Übersicht
ja:
  backToAdmin: 管理画面に戻る
</i18n>
