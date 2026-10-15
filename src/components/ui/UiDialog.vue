<script setup lang="ts">
import { X } from '@lucide/vue'
import { onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import { forgetModal, showModal } from '@/composables/useModals'
import UiButton from './UiButton.vue'

const { title, size = 'md' } = defineProps<{
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const open = defineModel<boolean>('open', { required: true })

const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
}

const titleId = useId()

const dialog = useTemplateRef('dialog')

let pressedOnBackdrop = false
let releasedOnBackdrop = false

watch(
    [open, dialog],
    ([isOpen, element]) => {
        if (!element) return
        if (isOpen && !element.open) showModal(element)
        if (!isOpen && element.open) element.close()
    },
    { flush: 'post' }
)

onBeforeUnmount(() => dialog.value && forgetModal(dialog.value))

const onClose = (event: Event) => {
    forgetModal(event.currentTarget as HTMLDialogElement)
    open.value = false
}

const onPointerdown = (event: PointerEvent) => {
    pressedOnBackdrop = event.target === event.currentTarget
}

const onPointerup = (event: PointerEvent) => {
    releasedOnBackdrop = event.target === event.currentTarget
}

const onClick = (event: MouseEvent) => {
    if (pressedOnBackdrop && releasedOnBackdrop && event.target === event.currentTarget) {
        open.value = false
    }
}
</script>

<template>
    <dialog
        ref="dialog"
        :aria-labelledby="titleId"
        :class="[
            'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-lg border border-border bg-bg p-0 text-text opacity-0 transition-opacity duration-150 open:opacity-100 starting:open:opacity-0',
            SIZES[size],
        ]"
        @close="onClose"
        @pointerdown="onPointerdown"
        @pointerup="onPointerup"
        @click="onClick"
    >
        <div v-if="open" class="flex max-h-[calc(100dvh-2rem)] flex-col">
            <header
                class="flex items-center justify-between gap-4 border-b border-border/40 px-5 py-3"
            >
                <h2 :id="titleId" class="min-w-0 text-base font-semibold wrap-break-word">
                    {{ title }}
                </h2>
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
                class="flex flex-wrap items-center justify-end gap-2 border-t border-border/40 px-5 py-3"
            >
                <slot name="footer" />
            </footer>
        </div>
    </dialog>
</template>
