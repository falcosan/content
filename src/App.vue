<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import SessionDialog from './components/SessionDialog.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'
import ToastRegion from './components/ui/ToastRegion.vue'
import UploadPanel from './components/ui/UploadPanel.vue'

const route = useRoute()
</script>

<template>
    <AppHeader v-if="!route.meta.public" />
    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RouterView v-slot="{ Component, route: current }">
            <component :is="Component" :key="current.path" />
        </RouterView>
    </main>
    <ToastRegion />
    <UploadPanel />
    <ConfirmDialog />
    <SessionDialog />
</template>
