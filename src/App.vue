<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import SessionDialog from './components/SessionDialog.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'
import ToastRegion from './components/ui/ToastRegion.vue'
import UploadPanel from './components/ui/UploadPanel.vue'
import { useTopModal } from './composables/useModals'

const route = useRoute()
const topModal = useTopModal()
</script>

<template>
    <AppHeader v-if="!route.meta.public" />
    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RouterView v-slot="{ Component, route: current }">
            <component :is="Component" :key="current.path" />
        </RouterView>
    </main>
    <Teleport :to="topModal" :disabled="!topModal">
        <div
            class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
        >
            <UploadPanel />
            <ToastRegion />
        </div>
    </Teleport>
    <ConfirmDialog />
    <SessionDialog />
</template>
