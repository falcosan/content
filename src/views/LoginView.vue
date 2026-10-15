<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '@/components/LoginForm.vue'
import { safeRedirect } from '@/lib/navigation'

const route = useRoute()
const router = useRouter()

const enter = () => router.replace(safeRedirect(route.query.redirect))
</script>

<template>
    <div class="flex min-h-[calc(100dvh-3rem)] items-center justify-center">
        <section class="w-full max-w-sm rounded-lg border border-border p-8">
            <h1 class="mb-6 text-xl font-bold tracking-tight">Sign in</h1>
            <LoginForm @success="enter" />
        </section>
    </div>
</template>
