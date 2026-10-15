<script setup lang="ts">
import MediaLibrary from '@/components/media/MediaLibrary.vue'
</script>

<template>
    <div class="flex flex-col gap-6">
        <header>
            <h1 class="text-2xl font-bold tracking-tight">Media</h1>
            <p class="text-sm text-text-light">
                Upload, organize and edit the files used in your posts.
            </p>
        </header>
        <MediaLibrary />
    </div>
</template>
