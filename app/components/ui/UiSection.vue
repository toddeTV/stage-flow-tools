<script setup lang="ts">
withDefaults(defineProps<{
  bare?: boolean
}>(), {
  bare: false,
})
</script>

<template>
  <section :class="{ 'border-[3px] border-black bg-white p-8': !bare }">
    <slot />
  </section>
</template>
