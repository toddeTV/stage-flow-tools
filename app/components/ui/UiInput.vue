<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string | number
  type?: string
  step?: string | number
  placeholder?: string
  required?: boolean
}>(), {
  type: 'text',
  step: '1',
  placeholder: '',
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  if (props.type === 'number') {
    const num = target.valueAsNumber
    if (Number.isNaN(num)) {
      emit('update:modelValue', target.value)
    }
    else {
      emit('update:modelValue', num)
    }
  }
  else {
    emit('update:modelValue', target.value)
  }
}
</script>

<template>
  <input
    :type="type"
    :step="step"
    :placeholder="placeholder"
    :value="modelValue"
    :required="required"
    class="p-3 border-2 border-black text-base bg-white"
    @input="onInput"
  >
</template>