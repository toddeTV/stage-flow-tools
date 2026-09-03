<script setup lang="ts">
definePageMeta({
  background: true,
  footer: true,
  layout: 'default',
  localeSwitcher: false,
})

useHead({ title: 'Legal Notice (Impressum)' })
</script>

<template>
  <AppLegalText :document="{ key: 'legal-notice', title: 'Legal Notice (Impressum)' }" />
</template>
