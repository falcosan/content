<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed } from 'vue'
import type { FieldOption } from '#types/api'
import NewOption from './NewOption.vue'

const {
    options,
    maxOptions = null,
    labelledBy,
    describedBy,
    invalid = false,
    fieldKey,
    allowNew = false,
} = defineProps<{
    options: FieldOption[]
    maxOptions?: number | null
    labelledBy: string
    describedBy?: string
    invalid?: boolean
    fieldKey: string
    allowNew?: boolean
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

const select = (value: string) => {
    if (!selected.value.includes(value) && !full.value) toggle(value)
}
</script>

<template>
    <div
        role="group"
        :aria-labelledby="labelledBy"
        :aria-describedby="describedBy"
        :aria-invalid="invalid || undefined"
        :tabindex="invalid ? -1 : undefined"
        class="flex flex-col gap-2"
    >
        <div v-if="options.length" class="flex flex-wrap gap-1.5">
            <button
                v-for="option in options"
                :key="option.value"
                type="button"
                :aria-pressed="selected.includes(option.value)"
                :disabled="full && !selected.includes(option.value)"
                class="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-xs font-medium transition-colors hover:not-disabled:border-text disabled:opacity-40 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-text aria-pressed:hover:not-disabled:border-accent-hover aria-pressed:hover:not-disabled:bg-accent-hover"
                @click="toggle(option.value)"
            >
                <Check v-if="selected.includes(option.value)" class="size-3" aria-hidden="true" />
                {{ option.name }}
            </button>
        </div>
        <NewOption v-if="allowNew" :field-key @added="select" />
    </div>
</template>
