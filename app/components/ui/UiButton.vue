<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'link' | 'danger'
  size?: 'normal' | 'small'
}>(), {
  type: 'button',
  variant: 'primary',
  size: 'normal',
})

const variantClasses: Record<string, string> = {
  primary: [
    'cursor-pointer border-[3px] border-black bg-black text-base uppercase text-white',
    'transition-all duration-200 hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]',
    'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-700',
    'disabled:hover:translate-x-0 disabled:hover:shadow-none',
  ].join(' '),
  secondary: [
    'cursor-pointer border-[3px] border-black bg-white uppercase text-black',
    'transition-all duration-200 hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]',
    'disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-200',
    'disabled:text-gray-500 disabled:hover:translate-x-0 disabled:hover:shadow-none',
  ].join(' '),
  link: [
    'cursor-pointer border-[3px] border-black bg-white text-lg uppercase text-black',
    'no-underline transition-all duration-300 hover:-translate-y-1 hover:bg-black',
    'hover:text-white hover:shadow-[0_5px_0_#000]',
    'disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-200',
    'disabled:text-gray-500 disabled:hover:translate-y-0 disabled:hover:bg-gray-200',
    'disabled:hover:text-gray-500 disabled:hover:shadow-none',
  ].join(' '),
  danger: [
    'cursor-pointer border-2 border-red-600 bg-red-600 uppercase text-white',
    'hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300',
    'disabled:hover:bg-red-300',
  ].join(' '),
}

const buttonVariantClass = computed(() => variantClasses[props.variant])
</script>

<template>
  <button
    :class="[
      buttonVariantClass,
      {
        'p-3': size === 'normal',
        'px-2 py-1 text-sm': size === 'small',
      },
    ]"
    :type="type"
  >
    <slot />
  </button>
</template>
