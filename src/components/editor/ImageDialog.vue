<script setup lang="ts">
import { Images } from '@lucide/vue'
import type { Editor } from '@tiptap/core'
import { computed, reactive, ref, watch } from 'vue'
import type { Asset } from '@/api/client'
import AssetPickerDialog from '@/components/media/AssetPickerDialog.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiDialog from '@/components/ui/UiDialog.vue'
import { parseHttpUrl } from '@/lib/embed'
import { thumbnailUrl } from '@/lib/assets'
import type { FigureAttributes } from './extensions/figure'

const { editor } = defineProps<{ editor: Editor }>()

const open = defineModel<boolean>('open', { required: true })

const form = reactive<FigureAttributes>({ src: '', alt: '', title: '', caption: '' })
const editing = ref(false)
const picking = ref(false)

const source = computed(() => parseHttpUrl(form.src)?.href ?? null)

watch(open, (isOpen) => {
    if (!isOpen) return
    editing.value = editor.isActive('figure')
    const current = editing.value
        ? (editor.getAttributes('figure') as Partial<FigureAttributes>)
        : {}
    Object.assign(form, {
        src: current.src ?? '',
        alt: current.alt ?? '',
        title: current.title ?? '',
        caption: current.caption ?? '',
    })
})

const pick = (asset: Asset) => {
    form.src = asset.url
    form.alt = asset.alt || form.alt
    form.title = asset.title || form.title
}

const save = () => {
    if (!source.value) return
    const attributes = { ...form, src: source.value }
    const chain = editor.chain().focus()
    if (editing.value) chain.updateAttributes('figure', attributes).run()
    else chain.setFigure(attributes).run()
    open.value = false
}

const remove = () => {
    editor.chain().focus().deleteSelection().run()
    open.value = false
}
</script>

<template>
    <UiDialog v-model:open="open" :title="editing ? 'Edit image' : 'Insert image'">
        <form id="image-form" class="flex flex-col gap-4" @submit.prevent="save">
            <div
                class="grid min-h-40 place-items-center overflow-hidden rounded-md border border-dashed border-ink/30 bg-ink/5"
            >
                <img
                    v-if="source"
                    :src="thumbnailUrl(source, 720)"
                    :alt="form.alt"
                    class="max-h-64 w-full object-contain"
                />
                <UiButton v-else :icon="Images" @click="picking = true">
                    Choose from library
                </UiButton>
            </div>
            <div class="flex items-end gap-2">
                <label class="block flex-1">
                    <span class="label">Image URL</span>
                    <input
                        v-model="form.src"
                        class="control"
                        inputmode="url"
                        placeholder="https://"
                        :aria-invalid="(!!form.src && !source) || undefined"
                    />
                </label>
                <UiButton v-if="source" :icon="Images" @click="picking = true">Library</UiButton>
            </div>
            <label class="block">
                <span class="label">Alt text</span>
                <input v-model="form.alt" class="control" />
            </label>
            <label class="block">
                <span class="label">Caption</span>
                <input v-model="form.caption" class="control" />
            </label>
            <label class="block">
                <span class="label">Title</span>
                <input v-model="form.title" class="control" />
            </label>
        </form>
        <template #footer>
            <UiButton v-if="editing" class="mr-auto" @click="remove">Remove image</UiButton>
            <UiButton @click="open = false">Cancel</UiButton>
            <UiButton type="submit" form="image-form" variant="solid" :disabled="!source">
                {{ editing ? 'Update' : 'Insert' }}
            </UiButton>
        </template>
        <AssetPickerDialog v-model:open="picking" :filetypes="['images']" @pick="pick" />
    </UiDialog>
</template>
