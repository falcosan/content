<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed } from 'vue'
import type { FieldOption } from '@/api/client'

const {
    options,
    maxOptions = null,
    labelledBy,
} = defineProps<{
    options: FieldOption[]
    maxOptions?: number | null
    labelledBy: string
}>()

const model = defineModel<unknown>()

const selected = computed(() =>
    Array.isArray(model.value)
        ? model.value.filter((value): value is string => typeof value === 'string')
        : []
)

const full = computed(() => maxOptions !== null && selected.value.length >= maxOptions)

const toggle = (value: string) => {
    model.value = selected.value.includes(value)
        ? selected.value.filter((item) => item !== value)
        : [...selected.value, value]
}
</script>

<template>
    <div role="group" :aria-labelledby="labelledBy" class="flex flex-wrap gap-1.5">
        <button
            v-for="option in options"
            :key="option.value"
            type="button"
            :aria-pressed="selected.includes(option.value)"
            :disabled="full && !selected.includes(option.value)"
            class="inline-flex h-7 items-center gap-1 rounded-full border border-ink/25 px-2.5 text-xs font-medium transition-colors hover:enabled:border-ink disabled:opacity-40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            @click="toggle(option.value)"
        >
            <Check v-if="selected.includes(option.value)" class="size-3" aria-hidden="true" />
            {{ option.name }}
        </button>
    </div>
</template>
