<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { computed, useSlots, type Component } from 'vue'

const {
    variant = 'outline',
    size = 'md',
    type = 'button',
    href,
    icon,
    loading = false,
    disabled = false,
} = defineProps<{
    variant?: 'solid' | 'outline' | 'ghost'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit'
    href?: string
    icon?: Component
    loading?: boolean
    disabled?: boolean
}>()

const slots = useSlots()

const VARIANTS = {
    solid: 'border border-ink bg-ink text-paper hover:bg-ink/85',
    outline: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink/5',
    ghost: 'border border-transparent text-ink hover:bg-ink/10',
}

const SIZES = {
    sm: { text: 'h-8 gap-1.5 px-2.5 text-xs', square: 'size-8' },
    md: { text: 'h-9 gap-2 px-3.5 text-sm', square: 'size-9' },
}

const classes = computed(() => [
    'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    slots.default ? SIZES[size].text : SIZES[size].square,
])

const attributes = computed(() =>
    href
        ? { href, target: '_blank', rel: 'noopener noreferrer' }
        : { type, disabled: disabled || loading }
)
</script>

<template>
    <component
        :is="href ? 'a' : 'button'"
        v-bind="attributes"
        :class="classes"
        :aria-busy="loading || undefined"
    >
        <LoaderCircle v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
        <component :is="icon" v-else-if="icon" class="size-4" aria-hidden="true" />
        <slot />
    </component>
</template>
