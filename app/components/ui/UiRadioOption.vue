<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  value: string | number
  disabled?: boolean
}>(), {
  modelValue: null,
  disabled: false,
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
    class="relative flex min-w-0 cursor-pointer items-center border-[3px] border-black p-5 transition-all duration-200"
    :class="{
      'bg-black text-white': modelValue === value,
      'cursor-not-allowed opacity-60': disabled,
      'hover:translate-x-1 hover:shadow-[-5px_5px_0_#000]': !disabled,
    }"
  >
    <input
      :checked="modelValue === value"
      class="mr-4 size-5 shrink-0"
      :class="modelValue === value ? 'accent-white' : 'accent-black'"
      :disabled="disabled"
      type="radio"
      :value="value"
      @change="handleChange"
    >
    <span class="min-w-0 flex-1 text-lg">
      <slot />
    </span>
  </label>
</template>
