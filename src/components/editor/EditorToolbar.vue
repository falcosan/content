<script setup lang="ts">
import {
    Bold,
    ClipboardCopy,
    Code,
    Highlighter,
    Image,
    Italic,
    Link,
    List,
    ListOrdered,
    Minus,
    MonitorPlay,
    Quote,
    Redo2,
    RemoveFormatting,
    SquareCode,
    Strikethrough,
    Underline,
    Undo2,
} from '@lucide/vue'
import type { Editor } from '@tiptap/core'
import { computed, ref, useTemplateRef, type Component } from 'vue'
import type { InsertKind, Tool } from '#types/editor'
import { copyToClipboard } from '@/lib/clipboard'
import { toMarkdown } from '@/lib/content'
import { roveFocus } from '@/lib/focus'
import { HEADING_LEVELS } from './extensions'

const { editor } = defineProps<{ editor: Editor }>()

const emit = defineEmits<{ insert: [kind: InsertKind] }>()

const BLOCK_LABEL = 'Text style'

const COPY_LABEL = 'Copy as Markdown'

const BLOCKS = [
    { value: 0, label: 'Paragraph' },
    ...HEADING_LEVELS.map((level) => ({ value: level, label: `Heading ${level}` })),
]

const GROUPS: Tool[][] = [
    [
        {
            label: 'Undo',
            icon: Undo2,
            disabled: () => !editor.can().undo(),
            run: (chain) => chain.undo(),
        },
        {
            label: 'Redo',
            icon: Redo2,
            disabled: () => !editor.can().redo(),
            run: (chain) => chain.redo(),
        },
    ],
    [
        { label: 'Bold', icon: Bold, active: 'bold', run: (chain) => chain.toggleBold() },
        { label: 'Italic', icon: Italic, active: 'italic', run: (chain) => chain.toggleItalic() },
        {
            label: 'Underline',
            icon: Underline,
            active: 'underline',
            run: (chain) => chain.toggleUnderline(),
        },
        {
            label: 'Strikethrough',
            icon: Strikethrough,
            active: 'strike',
            run: (chain) => chain.toggleStrike(),
        },
        {
            label: 'Highlight',
            icon: Highlighter,
            active: 'highlight',
            run: (chain) => chain.toggleHighlight(),
        },
        { label: 'Inline code', icon: Code, active: 'code', run: (chain) => chain.toggleCode() },
    ],
    [
        {
            label: 'Bullet list',
            icon: List,
            active: 'bulletList',
            run: (chain) => chain.toggleBulletList(),
        },
        {
            label: 'Numbered list',
            icon: ListOrdered,
            active: 'orderedList',
            run: (chain) => chain.toggleOrderedList(),
        },
        {
            label: 'Quote',
            icon: Quote,
            active: 'blockquote',
            run: (chain) => chain.toggleBlockquote(),
        },
        {
            label: 'Code block',
            icon: SquareCode,
            active: 'codeBlock',
            run: (chain) => chain.toggleCodeBlock(),
        },
        { label: 'Divider', icon: Minus, run: (chain) => chain.setHorizontalRule() },
    ],
    [
        {
            label: 'Clear formatting',
            icon: RemoveFormatting,
            run: (chain) => chain.clearNodes().unsetAllMarks(),
        },
    ],
]

const INSERTS: { label: string; icon: Component; kind: InsertKind; node: string }[] = [
    { label: 'Link', icon: Link, kind: 'link', node: 'link' },
    { label: 'Image', icon: Image, kind: 'image', node: 'figure' },
    { label: 'Embed video', icon: MonitorPlay, kind: 'embed', node: 'embed' },
]

const BUTTON_CLASS =
    'inline-flex size-8 items-center justify-center rounded transition-colors hover:not-disabled:bg-text/10 disabled:opacity-30 aria-pressed:bg-accent aria-pressed:text-accent-text aria-pressed:hover:not-disabled:bg-accent-hover data-active:bg-accent data-active:text-accent-text data-active:hover:not-disabled:bg-accent-hover'

const toolbar = useTemplateRef('toolbar')
const tabStop = ref(BLOCK_LABEL)

const block = computed({
    get: () => HEADING_LEVELS.find((level) => editor.isActive('heading', { level })) ?? 0,
    set: (level) => {
        if (level) editor.chain().focus().setHeading({ level }).run()
        else editor.chain().focus().setParagraph().run()
    },
})

const activeStop = computed(() =>
    GROUPS.flat().some(({ label, disabled }) => label === tabStop.value && disabled?.())
        ? BLOCK_LABEL
        : tabStop.value
)

const tabIndex = (label: string) => (label === activeStop.value ? 0 : -1)

const run = (tool: Tool) => tool.run(editor.chain().focus()).run()

const moveFocus = (event: KeyboardEvent) =>
    roveFocus(
        event,
        [...(toolbar.value?.querySelectorAll<HTMLElement>('button:enabled, select') ?? [])],
        ['ArrowLeft', 'ArrowRight']
    )

const copyMarkdown = () =>
    copyToClipboard(toMarkdown(editor.getHTML()), 'Markdown copied to clipboard')
</script>

<template>
    <div
        ref="toolbar"
        role="toolbar"
        aria-label="Formatting"
        class="flex items-center gap-1 overflow-x-auto border-b border-border/40 bg-bg px-2 py-1.5 md:flex-wrap"
        @keydown="moveFocus"
    >
        <template v-for="(group, index) in GROUPS" :key="index">
            <div v-if="index === 1" class="mx-1 flex items-center">
                <select
                    v-model="block"
                    :aria-label="BLOCK_LABEL"
                    :tabindex="tabIndex(BLOCK_LABEL)"
                    class="h-8 rounded border border-border bg-bg px-2 text-xs font-medium"
                    @focus="tabStop = BLOCK_LABEL"
                >
                    <option v-for="option in BLOCKS" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
            </div>
            <div class="flex items-center gap-0.5">
                <button
                    v-for="tool in group"
                    :key="tool.label"
                    type="button"
                    :class="BUTTON_CLASS"
                    :title="tool.label"
                    :aria-label="tool.label"
                    :aria-pressed="tool.active ? editor.isActive(tool.active) : undefined"
                    :disabled="tool.disabled?.()"
                    :tabindex="tabIndex(tool.label)"
                    @focus="tabStop = tool.label"
                    @mousedown.prevent
                    @click="run(tool)"
                >
                    <component :is="tool.icon" class="size-4" aria-hidden="true" />
                </button>
            </div>
            <span class="mx-1 h-5 w-px bg-border/40" aria-hidden="true" />
        </template>
        <div class="flex items-center gap-0.5">
            <button
                v-for="item in INSERTS"
                :key="item.label"
                type="button"
                :class="BUTTON_CLASS"
                :title="item.label"
                :aria-label="item.label"
                :data-active="editor.isActive(item.node) || undefined"
                :tabindex="tabIndex(item.label)"
                @focus="tabStop = item.label"
                @mousedown.prevent
                @click="emit('insert', item.kind)"
            >
                <component :is="item.icon" class="size-4" aria-hidden="true" />
            </button>
        </div>
        <button
            type="button"
            :class="[BUTTON_CLASS, 'ml-auto']"
            :title="COPY_LABEL"
            :aria-label="COPY_LABEL"
            :tabindex="tabIndex(COPY_LABEL)"
            @focus="tabStop = COPY_LABEL"
            @mousedown.prevent
            @click="copyMarkdown"
        >
            <ClipboardCopy class="size-4" aria-hidden="true" />
        </button>
    </div>
</template>
