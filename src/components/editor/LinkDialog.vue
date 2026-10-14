<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { computed, ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { parseHttpUrl } from '@/lib/embed'

const { editor } = defineProps<{ editor: Editor }>()

const open = defineModel<boolean>('open', { required: true })

const href = ref('')
const editing = ref(false)

const INTERNAL = /^(\/|#|mailto:|tel:)/

const normalized = computed(() => {
    const value = href.value.trim()
    if (INTERNAL.test(value)) return value
    return (parseHttpUrl(value) ?? parseHttpUrl(`https://${value}`))?.href ?? null
})

watch(open, (isOpen) => {
    if (!isOpen) return
    editing.value = editor.isActive('link')
    href.value = editing.value ? String(editor.getAttributes('link').href ?? '') : ''
})

const save = () => {
    const target = normalized.value
    if (!target) return
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && !editing.value) {
        chain
            .insertContent({
                type: 'text',
                text: target,
                marks: [{ type: 'link', attrs: { href: target } }],
            })
            .run()
    } else {
        chain.setLink({ href: target }).run()
    }
    open.value = false
}

const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    open.value = false
}
</script>

<template>
    <UiDialog v-model:open="open" :title="editing ? 'Edit link' : 'Insert link'" size="sm">
        <form id="link-form" @submit.prevent="save">
            <label class="block">
                <span class="label">URL</span>
                <input
                    v-model="href"
                    class="control"
                    inputmode="url"
                    placeholder="https://example.com"
                    autofocus
                    :aria-invalid="(!!href && !normalized) || undefined"
                />
            </label>
        </form>
        <template #footer>
            <UiButton v-if="editing" class="mr-auto" @click="remove">Remove link</UiButton>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton type="submit" form="link-form" variant="solid" :disabled="!normalized">
                {{ editing ? 'Update' : 'Insert' }}
            </UiButton>
        </template>
    </UiDialog>
</template>
