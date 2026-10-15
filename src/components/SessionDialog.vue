<script setup lang="ts">
import { sessionExpired } from '@/api/queryClient'
import LoginForm from './LoginForm.vue'
import UiDialog from './ui/UiDialog.vue'
</script>

<template>
    <UiDialog v-model:open="sessionExpired" title="Session expired" size="sm">
        <p class="mb-4 text-sm text-text-light">
            Sign in again to continue. Your unsaved work stays on this page.
        </p>
        <LoginForm />
    </UiDialog>
</template>
