<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { useRouter } from 'vue-router'
import UiButton from './ui/UiButton.vue'

const LINKS = [
    { to: { name: 'stories' }, label: 'Posts', match: ['stories', 'story'] },
    { to: { name: 'media' }, label: 'Media', match: ['media'] },
]

const router = useRouter()
</script>

<template>
    <header class="sticky top-0 z-30 border-b border-border/40 bg-bg/90 backdrop-blur">
        <div
            class="mx-auto flex h-header max-w-7xl items-center gap-2 px-4 sm:gap-6 sm:px-6 lg:px-8"
        >
            <nav aria-label="Main" class="flex items-center gap-1">
                <RouterLink
                    v-for="link in LINKS"
                    :key="link.label"
                    v-slot="{ href, navigate }"
                    :to="link.to"
                    custom
                >
                    <a
                        :href
                        :aria-current="
                            link.match.includes(String($route.name)) ? 'page' : undefined
                        "
                        class="rounded-md px-2.5 py-1.5 text-sm font-medium text-text-light transition-colors hover:text-text aria-[current=page]:bg-accent aria-[current=page]:text-accent-text sm:px-3"
                        @click="navigate"
                    >
                        {{ link.label }}
                    </a>
                </RouterLink>
            </nav>
            <UiButton
                variant="ghost"
                size="sm"
                :icon="LogOut"
                class="ml-auto"
                @click="router.push({ name: 'logout' })"
            >
                Sign out
            </UiButton>
        </div>
    </header>
</template>
