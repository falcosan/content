<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { computed, type Component } from 'vue'

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

const BASE =
    'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed'

const VARIANTS = {
    solid: 'border border-accent bg-accent text-accent-text hover:not-disabled:border-accent-hover hover:not-disabled:bg-accent-hover disabled:border-disabled disabled:bg-disabled disabled:text-text-light',
    outline:
        'border border-border text-text hover:not-disabled:border-text hover:not-disabled:bg-text/5 disabled:opacity-50',
    ghost: 'border border-transparent text-text hover:not-disabled:bg-text/10 disabled:opacity-50',
}

const SIZES = {
    sm: { text: 'h-8 gap-1.5 px-2.5 text-xs', square: 'size-8' },
    md: { text: 'h-9 gap-2 px-3.5 text-sm', square: 'size-9' },
}

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
        :class="[BASE, VARIANTS[variant], $slots.default ? SIZES[size].text : SIZES[size].square]"
        :aria-busy="loading || undefined"
    >
        <LoaderCircle v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
        <component :is="icon" v-else-if="icon" class="size-4" aria-hidden="true" />
        <slot />
    </component>
</template>
