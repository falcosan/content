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
import type { ChainedCommands, Editor } from '@tiptap/core'
import { computed, useTemplateRef, type Component } from 'vue'
import { notify } from '@/composables/useToasts'
import { toMarkdown } from '@/lib/content'

type InsertKind = 'link' | 'image' | 'embed'

const { editor } = defineProps<{ editor: Editor }>()

const emit = defineEmits<{ insert: [kind: InsertKind] }>()

interface Tool {
    label: string
    icon: Component
    active?: string
    disabled?: () => boolean
    run: (chain: ChainedCommands) => ChainedCommands
}

const HEADING_LEVELS = [1, 2, 3, 4, 5] as const

const BLOCKS = [
    { value: 'paragraph', label: 'Paragraph' },
    ...HEADING_LEVELS.map((level) => ({ value: `h${level}`, label: `Heading ${level}` })),
]

const block = computed({
    get: () => {
        const level = HEADING_LEVELS.find((value) => editor.isActive('heading', { level: value }))
        return level ? `h${level}` : 'paragraph'
    },
    set: (value: string) => {
        const level = HEADING_LEVELS.find((candidate) => `h${candidate}` === value)
        if (level) editor.chain().focus().setHeading({ level }).run()
        else editor.chain().focus().setParagraph().run()
    },
})

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

const run = (tool: Tool) => tool.run(editor.chain().focus()).run()

const toolbar = useTemplateRef('toolbar')

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }

const moveFocus = (event: KeyboardEvent) => {
    const step = STEPS[event.key]
    if (!step || !toolbar.value || !(event.target instanceof HTMLButtonElement)) return
    const buttons = [...toolbar.value.querySelectorAll<HTMLButtonElement>('button:enabled')]
    const index = buttons.indexOf(event.target)
    buttons[(index + step + buttons.length) % buttons.length]?.focus()
    event.preventDefault()
}

const copyMarkdown = async () => {
    await navigator.clipboard.writeText(toMarkdown(editor.getHTML()))
    notify('Markdown copied to clipboard')
}

const buttonClass =
    'inline-flex size-8 items-center justify-center rounded transition-colors hover:enabled:bg-ink/10 disabled:opacity-30 aria-pressed:bg-ink aria-pressed:text-paper data-active:bg-ink data-active:text-paper'
</script>

<template>
    <div
        ref="toolbar"
        role="toolbar"
        aria-label="Formatting"
        class="flex items-center gap-1 overflow-x-auto border-b border-ink/15 bg-paper px-2 py-1.5 md:flex-wrap"
        @keydown="moveFocus"
    >
        <template v-for="(group, index) in GROUPS" :key="index">
            <div v-if="index === 1" class="mx-1 flex items-center">
                <select
                    v-model="block"
                    aria-label="Text style"
                    class="h-8 rounded border border-ink/25 bg-paper px-2 text-xs font-medium"
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
                    :class="buttonClass"
                    :title="tool.label"
                    :aria-label="tool.label"
                    :aria-pressed="tool.active ? editor.isActive(tool.active) : undefined"
                    :disabled="tool.disabled?.()"
                    @mousedown.prevent
                    @click="run(tool)"
                >
                    <component :is="tool.icon" class="size-4" aria-hidden="true" />
                </button>
            </div>
            <span class="mx-1 h-5 w-px bg-ink/15" aria-hidden="true" />
        </template>
        <div class="flex items-center gap-0.5">
            <button
                v-for="item in INSERTS"
                :key="item.label"
                type="button"
                :class="buttonClass"
                :title="item.label"
                :aria-label="item.label"
                :data-active="editor.isActive(item.node) || undefined"
                @mousedown.prevent
                @click="emit('insert', item.kind)"
            >
                <component :is="item.icon" class="size-4" aria-hidden="true" />
            </button>
        </div>
        <button
            type="button"
            :class="[buttonClass, 'ml-auto']"
            title="Copy as Markdown"
            aria-label="Copy as Markdown"
            @mousedown.prevent
            @click="copyMarkdown"
        >
            <ClipboardCopy class="size-4" aria-hidden="true" />
        </button>
    </div>
</template>
