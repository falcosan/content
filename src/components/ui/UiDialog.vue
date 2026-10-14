<script setup lang="ts">
import { X } from '@lucide/vue'
import { onMounted, useId, useTemplateRef, watch } from 'vue'
import UiButton from './UiButton.vue'

const { title, size = 'md' } = defineProps<{
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const open = defineModel<boolean>('open', { required: true })

const dialog = useTemplateRef('dialog')
const titleId = useId()

const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
}

const sync = (value: boolean) => {
    const element = dialog.value
    if (!element) return
    if (value && !element.open) element.showModal()
    if (!value && element.open) element.close()
}

onMounted(() => sync(open.value))
watch(open, sync, { flush: 'post' })
</script>

<template>
    <dialog
        ref="dialog"
        :aria-labelledby="titleId"
        :class="[
            'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-lg border border-ink bg-paper p-0 text-ink opacity-0 transition-all transition-discrete duration-150 open:opacity-100 starting:open:opacity-0 backdrop:transition-all backdrop:transition-discrete backdrop:duration-150',
            SIZES[size],
        ]"
        @close="open = false"
        @click.self="open = false"
    >
        <div v-if="open" class="flex max-h-[calc(100dvh-2rem)] flex-col">
            <header
                class="flex items-center justify-between gap-4 border-b border-ink/15 px-5 py-3"
            >
                <h2 :id="titleId" class="text-base font-semibold">{{ title }}</h2>
                <UiButton
                    variant="ghost"
                    size="sm"
                    :icon="X"
                    aria-label="Close"
                    @click="open = false"
                />
            </header>
            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <slot />
            </div>
            <footer
                v-if="$slots.footer"
                class="flex flex-wrap items-center justify-end gap-2 border-t border-ink/15 px-5 py-3"
            >
                <slot name="footer" />
            </footer>
        </div>
    </dialog>
</template>
