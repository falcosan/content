<script setup lang="ts">
import type { StoryStatus } from '@/api/client'

const { status } = defineProps<{ status: StoryStatus }>()

const BADGES: Record<StoryStatus, { label: string; class: string }> = {
    published: { label: 'Published', class: 'border-ink bg-ink text-paper' },
    changed: { label: 'Unpublished changes', class: 'border-ink text-ink' },
    draft: { label: 'Draft', class: 'border-dashed border-ink/60 text-ink/80' },
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
