<script setup lang="ts">
import { File, FileText, Image, Music, Video } from '@lucide/vue'
import { computed, type Component } from 'vue'
import type { AssetKind } from '#types/app'
import { assetKind } from '@/lib/assets'

const { contentType } = defineProps<{ contentType: string }>()

const ICONS: Record<AssetKind, Component> = {
    image: Image,
    video: Video,
    audio: Music,
    document: FileText,
    file: File,
}

const icon = computed(() => ICONS[assetKind(contentType)])
</script>

<template>
    <component :is="icon" aria-hidden="true" />
</template>
