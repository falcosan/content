<script setup lang="ts">
import type { StoryStatus } from '#types/api'

const { status } = defineProps<{ status: StoryStatus }>()

const BADGES: Record<StoryStatus, { label: string; class: string }> = {
    published: { label: 'Published', class: 'border-accent bg-accent text-accent-text' },
    changed: { label: 'Unpublished changes', class: 'border-accent text-accent' },
    draft: { label: 'Draft', class: 'border-dashed border-border text-text-light' },
}
</script>

<template>
    <span
        :class="[
            'inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium whitespace-nowrap',
            BADGES[status].class,
        ]"
    >
        {{ BADGES[status].label }}
    </span>
</template>
