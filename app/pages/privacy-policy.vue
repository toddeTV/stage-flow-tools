<script setup lang="ts">
definePageMeta({
  background: true,
  footer: true,
  layout: 'default',
  localeSwitcher: false,
})

useHead({ title: 'Privacy Policy (Datenschutzerklärung)' })
</script>

<template>
  <AppLegalText :document="{ key: 'privacy-policy', title: 'Privacy Policy (Datenschutzerklärung)' }" />
</template>
