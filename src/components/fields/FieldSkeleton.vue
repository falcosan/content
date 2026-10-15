<script setup lang="ts">
const { blocks, hint = false } = defineProps<{ blocks: string[]; hint?: boolean }>()
</script>

<template>
    <div>
        <span class="label"><span class="skeleton-text">Field label</span></span>
        <span class="flex flex-col gap-2">
            <span
                v-for="(block, index) in blocks"
                :key="index"
                :class="['block rounded-md bg-text/10', block]"
            />
        </span>
        <span v-if="hint" class="hint block"><span class="skeleton-text">blog/post</span></span>
    </div>
</template>
