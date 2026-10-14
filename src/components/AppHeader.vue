<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { useSession, useSignOut } from '@/composables/useSession'
import { APP_TITLE } from '@/lib/navigation'
import UiButton from './ui/UiButton.vue'

const { data: session } = useSession()
const signOut = useSignOut()

const LINKS = [
    { to: { name: 'stories' }, label: 'Posts', match: ['stories', 'story'] },
    { to: { name: 'media' }, label: 'Media', match: ['media'] },
]
</script>

<template>
    <header class="sticky top-0 z-30 border-b border-ink/15 bg-paper/90 backdrop-blur">
        <div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
            <RouterLink :to="{ name: 'stories' }" class="text-sm font-bold tracking-tight">
                {{ APP_TITLE }}
            </RouterLink>
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
                        class="rounded-md px-3 py-1.5 text-sm font-medium text-ink/60 transition-colors hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
                        @click="navigate"
                    >
                        {{ link.label }}
                    </a>
                </RouterLink>
            </nav>
            <div class="ml-auto flex items-center gap-3">
                <span v-if="session" class="hidden text-xs text-ink/60 sm:inline">
                    {{ session.user }}
                </span>
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="LogOut"
                    :loading="signOut.isPending.value"
                    @click="signOut.mutate()"
                >
                    Sign out
                </UiButton>
            </div>
        </div>
    </header>
</template>
