<script setup lang="ts">
defineProps({
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button'
  },
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'link' | 'danger'>,
    default: 'primary'
  },
  size: {
    type: String as PropType<'normal' | 'small'>,
    default: 'normal'
  }
})
</script>

<template>
  <button
    :type="type"
    :class="{
      'bg-black text-white text-base uppercase cursor-pointer transition-all duration-300 hover:bg-white hover:text-black hover:shadow-inner-black disabled:bg-gray-400 disabled:text-gray-700 disabled:cursor-not-allowed disabled:hover:bg-gray-400 disabled:hover:text-gray-700 disabled:hover:shadow-none': variant === 'primary',
      'bg-white text-black border-2 border-black cursor-pointer uppercase hover:bg-black hover:text-white disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-200 disabled:hover:text-gray-500': variant === 'secondary',
      'bg-white text-black border-[3px] border-black no-underline uppercase text-lg transition-all duration-300 cursor-pointer hover:bg-black hover:text-white hover:-translate-y-1 hover:shadow-[0_5px_0_#000] disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-200 disabled:hover:text-gray-500 disabled:hover:translate-y-0 disabled:hover:shadow-none': variant === 'link',
      'bg-red-600 text-white border-2 border-red-600 cursor-pointer uppercase hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed disabled:hover:bg-red-300': variant === 'danger',
      'p-3': size === 'normal',
      'py-1 px-2 text-sm': size === 'small'
    }"
  >
    <slot />
  </button>
</template>