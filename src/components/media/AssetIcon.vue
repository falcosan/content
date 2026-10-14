<script setup lang="ts">
import { File, FileText, Music, Video } from '@lucide/vue'
import { computed } from 'vue'

const { contentType } = defineProps<{ contentType: string }>()

const icon = computed(() => {
    if (contentType.startsWith('video/')) return Video
    if (contentType.startsWith('audio/')) return Music
    if (contentType.startsWith('text/') || contentType === 'application/pdf') return FileText
    return File
})
</script>

<template>
    <component :is="icon" aria-hidden="true" />
</template>
