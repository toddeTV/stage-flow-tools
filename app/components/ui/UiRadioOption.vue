<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: [String, Number] as any,
    required: false,
    default: null
  },
  value: {
    type: [String, Number],
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
}>()

function handleChange() {
  emit('update:modelValue', props.value)
}
</script>

<template>
  <label
    class="flex items-center p-5 border-[3px] border-black cursor-pointer transition-all duration-200 relative"
    :class="{
      'bg-black text-white': modelValue === value,
      'opacity-60 cursor-not-allowed': disabled,
      'hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]': !disabled
    }"
  >
    <input
      type="radio"
      :value="value"
      :checked="modelValue === value"
      :disabled="disabled"
      class="w-5 h-5 mr-4"
      :class="modelValue === value ? 'accent-white' : 'accent-black'"
      @change="handleChange"
    >
    <span class="text-lg">
      <slot />
    </span>
  </label>
</template>