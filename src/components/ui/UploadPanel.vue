<script setup lang="ts">
import { CircleAlert, CircleCheck, LoaderCircle, X } from '@lucide/vue'
import { dismissUpload, useUploads } from '@/composables/useUploads'

const { items } = useUploads()
</script>

<template>
    <section
        v-if="items.length"
        class="pointer-events-auto rounded-lg border border-border bg-bg p-3"
        aria-label="Uploads"
    >
        <ul class="flex max-h-64 flex-col gap-3 overflow-y-auto">
            <li v-for="item in items" :key="item.id" class="text-xs">
                <div class="flex items-center gap-2">
                    <LoaderCircle
                        v-if="item.status === 'uploading'"
                        class="size-4 shrink-0 animate-spin"
                        aria-hidden="true"
                    />
                    <CircleCheck
                        v-else-if="item.status === 'done'"
                        class="size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <CircleAlert v-else class="size-4 shrink-0" aria-hidden="true" />
                    <span class="min-w-0 flex-1 font-medium wrap-break-word">{{ item.name }}</span>
                    <button
                        v-if="item.status === 'failed'"
                        type="button"
                        class="rounded p-0.5 opacity-70 hover:opacity-100"
                        :aria-label="`Dismiss ${item.name}`"
                        @click="dismissUpload(item.id)"
                    >
                        <X class="size-3.5" aria-hidden="true" />
                    </button>
                </div>
                <p v-if="item.status === 'failed'" class="mt-1 text-text-light">{{ item.error }}</p>
                <div
                    v-else
                    class="mt-1.5 h-1 overflow-hidden rounded-full bg-accent-bg"
                    role="progressbar"
                    :aria-label="`Uploading ${item.name}`"
                    :aria-valuenow="Math.round(item.progress * 100)"
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div
                        class="h-full bg-accent transition-[width]"
                        :style="{ width: `${item.progress * 100}%` }"
                    />
                </div>
            </li>
        </ul>
    </section>
</template>
