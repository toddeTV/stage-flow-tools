<script setup lang="ts">
defineProps({
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button'
  },
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'link'>,
    default: 'primary'
  }
})
</script>

<template>
  <button
    :type="type"
    :class="{
      'p-3 bg-black text-white text-base uppercase cursor-pointer transition-all duration-300 hover:bg-white hover:text-black hover:shadow-inner-black': variant === 'primary',
      'py-2 px-4 bg-white text-black border-2 border-black cursor-pointer uppercase hover:bg-black hover:text-white': variant === 'secondary',
      'inline-block py-4 px-8 bg-white text-black border-[3px] border-black no-underline uppercase text-lg transition-all duration-300 cursor-pointer hover:bg-black hover:text-white hover:-translate-y-1 hover:shadow-[0_5px_0_#000]': variant === 'link'
    }"
  >
    <slot />
  </button>
</template>