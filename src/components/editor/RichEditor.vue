<script setup lang="ts">
import type { EditorEvents } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, reactive, watch } from 'vue'
import type { InsertKind } from '#types/editor'
import { useSession } from '@/composables/useSession'
import { useUploads } from '@/composables/useUploads'
import { fromEditorHtml, plainText, toEditorHtml } from '@/lib/content'
import EditorToolbar from './EditorToolbar.vue'
import EmbedDialog from './EmbedDialog.vue'
import { editorExtensions } from './extensions'
import ImageDialog from './ImageDialog.vue'
import LinkDialog from './LinkDialog.vue'

const {
    maxLength = null,
    required = false,
    invalid = false,
    labelledBy,
    describedBy,
} = defineProps<{
    maxLength?: number | null
    required?: boolean
    invalid?: boolean
    labelledBy?: string
    describedBy?: string
}>()

const model = defineModel<string>({ required: true })

const { upload } = useUploads()
const { data: session } = useSession()
const editor = useEditor({
    content: toEditorHtml(model.value),
    extensions: editorExtensions({
        onImages: (files, position) => insertImages(files, position),
    }),
    editorProps: {
        attributes: () => attributes.value,
        handleClick: (_view, _position, event) => {
            const link = (event.target as HTMLElement).closest('a[href]')
            if (!link || !(event.metaKey || event.ctrlKey)) return false
            const url = URL.parse(link.getAttribute('href') ?? '', session.value?.siteUrl)
            if (url) window.open(url, '_blank', 'noopener,noreferrer')
            return true
        },
        handleDoubleClickOn: (_view, _position, node) => {
            if (node.type.name === 'figure') dialogs.image = true
            else if (node.type.name === 'embed') dialogs.embed = true
            else return false
            return true
        },
    },
    onUpdate: ({ editor: current }) => {
        emitted = fromEditorHtml(current.getHTML())
        model.value = emitted
    },
})

const dialogs = reactive<Record<InsertKind, boolean>>({ link: false, image: false, embed: false })
let emitted = model.value

const attributes = computed(() => ({
    class: 'prose-content min-h-96 p-5 outline-none',
    'aria-multiline': 'true',
    ...(required && { 'aria-required': 'true' }),
    ...(labelledBy && { 'aria-labelledby': labelledBy }),
    ...(describedBy && { 'aria-describedby': describedBy }),
    ...(invalid && { 'aria-invalid': 'true' }),
}))

const characters = computed(() => plainText(model.value).length)
const words = computed(() => editor.value?.storage.characterCount.words() ?? 0)

watch(model, (value) => {
    if (value === emitted) return
    emitted = value
    editor.value?.commands.setContent(toEditorHtml(value), { emitUpdate: false })
})

watch(attributes, () => editor.value?.setOptions())

const insertImages = async (files: File[], position?: number) => {
    const current = editor.value
    if (!current) return
    let at = position ?? current.state.selection.to
    const follow = ({ transaction }: EditorEvents['transaction']) => {
        at = transaction.mapping.map(at)
    }
    current.on('transaction', follow)
    const assets = await upload(files, { folderId: null }).finally(() =>
        current.off('transaction', follow)
    )
    if (!assets.length) return
    current
        .chain()
        .focus()
        .insertContentAt(
            at,
            assets.map((asset) => ({
                type: 'figure',
                attrs: { src: asset.url, alt: asset.alt, title: asset.title, caption: '' },
            }))
        )
        .run()
}
</script>

<template>
    <div
        :class="[
            'overflow-clip rounded-md border transition-colors focus-within:border-accent',
            invalid ? 'border-2 border-text' : 'border-border',
        ]"
    >
        <template v-if="editor">
            <div class="sticky top-(--sticky-top,0px) z-10">
                <EditorToolbar :editor @insert="dialogs[$event] = true" />
            </div>
            <EditorContent :editor />
            <div
                class="flex justify-end gap-3 border-t border-border/40 px-3 py-1.5 text-xs text-text-light"
            >
                <span>{{ words }} {{ words === 1 ? 'word' : 'words' }}</span>
                <span>
                    {{ characters }}{{ maxLength ? `/${maxLength}` : '' }}
                    {{ characters === 1 ? 'character' : 'characters' }}
                </span>
            </div>
            <LinkDialog v-model:open="dialogs.link" :editor />
            <ImageDialog v-model:open="dialogs.image" :editor />
            <EmbedDialog v-model:open="dialogs.embed" :editor />
        </template>
    </div>
</template>
