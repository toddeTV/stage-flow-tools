<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  size?: 'small' | 'medium'
}>(), {
  disabled: false,
  size: 'medium',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}

const sizeClasses = computed(() => {
  return {
    'p-5': props.size === 'medium',
    'p-2': props.size === 'small',
    'text-lg': props.size === 'medium',
    'text-sm': props.size === 'small'
  }
})

const inputSizeClasses = computed(() => {
  return {
    'w-5 h-5 mr-4': props.size === 'medium',
    'w-4 h-4 mr-2': props.size === 'small'
  }
})
</script>

<template>
  <label
    class="flex items-center border-[3px] border-black cursor-pointer transition-all duration-200 relative"
    :class="[
      sizeClasses,
      {
        'bg-black text-white': modelValue,
        'opacity-60 cursor-not-allowed': disabled,
        'hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]': !disabled
      }
    ]"
  >
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class=""
      :class="[inputSizeClasses, modelValue ? 'accent-white' : 'accent-black']"
      @change="handleChange"
    >
    <span class="font-bold">
      <slot />
    </span>
  </label>
</template>