<script setup lang="ts">
import { computed } from 'vue'
import PresenterLegacy from '~/components/presenter/PresenterLegacy.vue'
import PresenterEmbedController from '~/components/presenter/PresenterEmbedController.vue'
import PresenterEmbedDisplay from '~/components/presenter/PresenterEmbedDisplay.vue'

definePageMeta({
  background: false,
  footer: false,
  layout: 'default',
  localeSwitcher: false,
  middleware: 'auth',
})
const route = useRoute()
const embed = computed(() => route.query.embed)
</script>

<template>
  <PresenterEmbedController v-if="embed === 'controller'" />
  <PresenterEmbedDisplay v-else-if="embed === 'display'" />
  <PresenterLegacy v-else-if="embed === undefined" />
  <p v-else role="status">Invalid presentation embed mode.</p>
</template>
