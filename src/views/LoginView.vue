<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '@/components/LoginForm.vue'
import { APP_TITLE, safeRedirect } from '@/lib/navigation'

const route = useRoute()
const router = useRouter()

const enter = () => router.replace(safeRedirect(route.query.redirect))
</script>

<template>
    <div class="flex min-h-[calc(100dvh-3rem)] items-center justify-center">
        <section class="w-full max-w-sm rounded-lg border border-border p-8">
            <h1 class="mb-1 text-xl font-bold tracking-tight">{{ APP_TITLE }}</h1>
            <p class="mb-6 text-sm text-text-light">Sign in to manage posts and media.</p>
            <LoginForm @success="enter" />
        </section>
    </div>
</template>
