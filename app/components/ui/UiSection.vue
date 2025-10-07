<script setup lang="ts">
defineProps({
  bare: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <section :class="{ 'bg-white border-[3px] border-black p-8' : !bare }">
    <slot />
  </section>
</template>