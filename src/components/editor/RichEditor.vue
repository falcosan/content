<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, ref, watch } from 'vue'
import { useUploads } from '@/composables/useUploads'
import { fromEditorHtml, toEditorHtml } from '@/lib/content'
import EditorToolbar from './EditorToolbar.vue'
import EmbedDialog from './EmbedDialog.vue'
import { editorExtensions } from './extensions'
import ImageDialog from './ImageDialog.vue'
import LinkDialog from './LinkDialog.vue'

const {
    maxLength = null,
    invalid = false,
    labelledBy,
    describedBy,
} = defineProps<{
    maxLength?: number | null
    invalid?: boolean
    labelledBy?: string
    describedBy?: string
}>()

const model = defineModel<string>({ required: true })

const dialog = ref<'link' | 'image' | 'embed' | null>(null)
const { upload } = useUploads()

const dialogModel = (kind: 'link' | 'image' | 'embed') =>
    computed({
        get: () => dialog.value === kind,
        set: (open: boolean) => (dialog.value = open ? kind : null),
    })

const linkOpen = dialogModel('link')
const imageOpen = dialogModel('image')
const embedOpen = dialogModel('embed')

const attributes = () => ({
    class: 'prose-content min-h-96 px-5 py-5 outline-none',
    role: 'textbox',
    'aria-multiline': 'true',
    ...(labelledBy && { 'aria-labelledby': labelledBy }),
    ...(describedBy && { 'aria-describedby': describedBy }),
    ...(invalid && { 'aria-invalid': 'true' }),
})

const insertImages = async (files: File[], position?: number) => {
    const assets = await upload(files, { folderId: null })
    const current = editor.value
    if (!current || !assets.length) return
    const at = Math.min(position ?? current.state.selection.to, current.state.doc.content.size)
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

let emitted = model.value

const editor = useEditor({
    content: toEditorHtml(model.value),
    extensions: editorExtensions({ maxLength, onImages: insertImages }),
    editorProps: {
        attributes: attributes(),
        handleClick: (_view, _position, event) => {
            const link = (event.target as HTMLElement).closest('a[href]')
            if (!link || !(event.metaKey || event.ctrlKey)) return false
            window.open(link.getAttribute('href') ?? '', '_blank', 'noopener,noreferrer')
            return true
        },
        handleDoubleClickOn: (_view, _position, node) => {
            if (node.type.name === 'figure') dialog.value = 'image'
            else if (node.type.name === 'embed') dialog.value = 'embed'
            else return false
            return true
        },
    },
    onUpdate: ({ editor: current }) => {
        emitted = fromEditorHtml(current.getHTML())
        model.value = emitted
    },
})

watch(model, (value) => {
    if (value === emitted) return
    emitted = value
    editor.value?.commands.setContent(toEditorHtml(value), { emitUpdate: false })
})

watch([() => invalid, () => labelledBy, () => describedBy], () =>
    editor.value?.setOptions({
        editorProps: { ...editor.value.options.editorProps, attributes: attributes() },
    })
)

const characters = computed(() => editor.value?.storage.characterCount.characters() ?? 0)
const words = computed(() => editor.value?.storage.characterCount.words() ?? 0)
</script>

<template>
    <div
        :class="[
            'overflow-clip rounded-md border transition-colors focus-within:border-ink',
            invalid ? 'border-2 border-ink' : 'border-ink/25',
        ]"
    >
        <template v-if="editor">
            <div class="sticky top-(--sticky-top,0px) z-10">
                <EditorToolbar :editor @insert="dialog = $event" />
            </div>
            <EditorContent :editor />
            <div
                class="flex justify-end gap-3 border-t border-ink/15 px-3 py-1.5 text-xs text-ink/60"
            >
                <span>{{ words }} {{ words === 1 ? 'word' : 'words' }}</span>
                <span>
                    {{ characters }}{{ maxLength ? `/${maxLength}` : '' }}
                    {{ characters === 1 ? 'character' : 'characters' }}
                </span>
            </div>
            <LinkDialog v-model:open="linkOpen" :editor />
            <ImageDialog v-model:open="imageOpen" :editor />
            <EmbedDialog v-model:open="embedOpen" :editor />
        </template>
    </div>
</template>
