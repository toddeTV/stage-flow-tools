<script setup lang="ts">
withDefaults(defineProps<{
  bare?: boolean
}>(), {
  bare: false,
})
</script>

<template>
  <section :class="{ 'bg-white border-[3px] border-black p-8' : !bare }">
    <slot />
  </section>
</template>