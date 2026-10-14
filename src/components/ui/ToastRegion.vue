<script setup lang="ts">
import { CircleAlert, X } from '@lucide/vue'
import { dismissToast, useToasts } from '@/composables/useToasts'

const toasts = useToasts()
</script>

<template>
    <div
        class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
        aria-live="polite"
    >
        <TransitionGroup
            enter-from-class="translate-y-2 opacity-0"
            leave-to-class="opacity-0"
            enter-active-class="transition duration-150"
            leave-active-class="transition duration-150"
        >
            <div
                v-for="toast in toasts"
                :key="toast.id"
                :role="toast.tone === 'error' ? 'alert' : 'status'"
                :class="[
                    'pointer-events-auto flex items-start gap-3 rounded-lg border-2 border-ink px-4 py-3 text-sm',
                    toast.tone === 'error' ? 'bg-paper text-ink' : 'bg-ink text-paper',
                ]"
            >
                <CircleAlert
                    v-if="toast.tone === 'error'"
                    class="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                />
                <p class="min-w-0 flex-1 wrap-break-word">{{ toast.message }}</p>
                <button
                    type="button"
                    class="-m-1 rounded p-1 opacity-70 hover:opacity-100"
                    aria-label="Dismiss"
                    @click="dismissToast(toast.id)"
                >
                    <X class="size-4" aria-hidden="true" />
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>
