<script setup lang="ts" generic="Value extends string">
import { useId } from 'vue'

const { options, label } = defineProps<{
    options: { value: Value; label: string }[]
    label: string
}>()

const model = defineModel<Value>({ required: true })

const name = useId()
</script>

<template>
    <div
        role="radiogroup"
        :aria-label="label"
        class="flex flex-wrap rounded-md border border-border p-0.5"
    >
        <label
            v-for="option in options"
            :key="option.value"
            class="cursor-pointer rounded px-3 py-1.5 text-sm font-medium text-text-light transition-colors has-checked:bg-accent has-checked:text-accent-text has-focus-visible:outline-2 has-focus-visible:outline-accent"
        >
            <input v-model="model" type="radio" class="sr-only" :name :value="option.value" />
            {{ option.label }}
        </label>
    </div>
</template>
